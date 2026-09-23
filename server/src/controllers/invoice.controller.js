// ====================================================================
// Nudge: Invoices Controller
// Handles invoice upload, OCR/AI data extraction, deterministic
// statutory deadline calculation, status evaluation, and manual corrections.
// ====================================================================

import {
  computeStatutoryDeadline,
  evaluateComplianceStatus,
  calculateMSMEDInterest,
  formatDateUTC
} from '../services/compliance.service.js';
import { extractInvoiceData, draftDeclarationRequest } from '../services/ai.service.js';
import { logAuditEvent } from '../services/audit.service.js';
import { sendEmail } from '../services/email.service.js';
import { createAdminSupabaseClient } from '../lib/supabaseClient.js';

export async function listInvoices(req, res) {
  try {
    const { status, vendor_id, search } = req.query;
    let query = req.supabase
      .from('invoices')
      .select(`
        *,
        vendors ( id, name, email, udyam_category, udyam_registration_number ),
        interest_calculations ( id, applicable_rate, days_overdue, interest_amount, calculated_at )
      `)
      .order('computed_deadline', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }
    if (vendor_id) {
      query = query.eq('vendor_id', vendor_id);
    }
    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,po_number.ilike.%${search}%`);
    }

    const { data: invoices, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Database Query Failed', message: error.message });
    }

    // Refresh dynamic status based on today's evaluation
    const today = formatDateUTC(new Date());
    const enriched = (invoices || []).map(inv => {
      const evalResult = evaluateComplianceStatus({
        computed_deadline: inv.computed_deadline,
        payment_date: inv.payment_date,
        as_of_date: today
      });
      return {
        ...inv,
        live_status: evalResult.status,
        days_to_breach: evalResult.days_to_breach,
        is_breached: evalResult.is_breached
      };
    });

    return res.json({ data: enriched });
  } catch (err) {
    console.error('[LIST_INVOICES_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function uploadInvoice(req, res) {
  try {
    const file = req.file;
    const { vendor_id: reqVendorId, acceptance_date: reqAcceptanceDate, agreement_basis: reqAgreementBasis, agreement_days: reqAgreementDays } = req.body;

    let documentText = '';
    let filePath = null;

    if (file) {
      // Extract textual content from file buffer
      documentText = file.buffer ? file.buffer.toString('utf8') : '';
      if (!documentText || documentText.length < 10) {
        documentText = `Invoice File: ${file.originalname}\nMimeType: ${file.mimetype}\nSize: ${file.size} bytes\nDate: ${new Date().toISOString().slice(0,10)}`;
      }

      // Upload to private Supabase Storage bucket 'nudge-documents' if configured
      try {
        const storageFileName = `invoices/${req.org_id}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { data: storageData, error: storageErr } = await req.supabase.storage
          .from('nudge-documents')
          .upload(storageFileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (!storageErr && storageData) {
          filePath = storageData.path;
        } else {
          filePath = `local_mock_storage/${storageFileName}`;
        }
      } catch (storageException) {
        filePath = `local_mock_storage/${file.originalname}`;
      }
    } else if (req.body.document_text) {
      documentText = req.body.document_text;
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No invoice document file or document_text provided.'
      });
    }

    // Step 1: Call Gemini Server-Side AI Extraction with prompt injection defense (supports PDF/image multimodal)
    const extractedData = await extractInvoiceData({
      fileBuffer: file?.buffer,
      mimeType: file?.mimetype,
      fileName: file?.originalname,
      documentText
    });

    // Step 2: Fetch Org Settings for defaults
    const { data: orgSettings } = await req.supabase
      .from('org_settings')
      .select('*')
      .eq('org_id', req.org_id)
      .maybeSingle();

    const defaultAgreementBasis = orgSettings?.default_agreement_basis || 'no_agreement';
    const alertLeadTimeDays = orgSettings?.alert_lead_time_days || 5;

    // Step 3: Match or Resolve Vendor
    let vendorId = reqVendorId || null;
    let vendor = null;

    if (vendorId) {
      const { data: v } = await req.supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .maybeSingle();
      vendor = v;
    } else if (extractedData.vendor_name) {
      const trimmedName = extractedData.vendor_name.trim();

      // 1. Exact case-insensitive match
      const { data: existingVendor } = await req.supabase
        .from('vendors')
        .select('*')
        .eq('org_id', req.org_id)
        .ilike('name', trimmedName)
        .maybeSingle();

      if (existingVendor) {
        vendor = existingVendor;
        vendorId = existingVendor.id;
      } else {
        // 2. Fuzzy match across existing vendors in organization
        const { data: allVendors } = await req.supabase
          .from('vendors')
          .select('*')
          .eq('org_id', req.org_id);

        const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetClean = cleanStr(trimmedName);

        const matchedVendor = (allVendors || []).find(v => {
          const vClean = cleanStr(v.name);
          return vClean && (targetClean.includes(vClean) || vClean.includes(targetClean));
        });

        if (matchedVendor) {
          vendor = matchedVendor;
          vendorId = matchedVendor.id;
        } else {
          // 3. Auto-provision unverified vendor record
          const clientToUse = req.supabase || createAdminSupabaseClient();
          const { data: newVendor, error: newVendorErr } = await clientToUse
            .from('vendors')
            .insert({
              org_id: req.org_id,
              name: trimmedName,
              email: `accounts@${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'vendor'}.com`,
              udyam_category: 'unknown'
            })
            .select()
            .single();

          if (newVendor) {
            vendor = newVendor;
            vendorId = newVendor.id;
          } else if (newVendorErr) {
            console.error('[VENDOR_AUTO_PROVISION_ERROR]', newVendorErr);
          }
        }
      }
    }

    // Step 4: Determine Final Compliance Parameters
    const finalAcceptanceDate = reqAcceptanceDate || extractedData.acceptance_date || formatDateUTC(new Date());
    const finalAgreementBasis = reqAgreementBasis || (extractedData.has_written_agreement ? 'written_agreement' : defaultAgreementBasis);
    const finalAgreementDays = reqAgreementDays !== undefined 
      ? Number(reqAgreementDays) 
      : (extractedData.agreement_days || (finalAgreementBasis === 'written_agreement' ? 30 : null));

    // Step 5: DETERMINISTIC Statutory Deadline Calculation (Section 15 MSMED)
    // NEVER computed by LLM!
    const { computed_deadline, applicable_window_days } = computeStatutoryDeadline({
      acceptance_date: finalAcceptanceDate,
      agreement_basis: finalAgreementBasis,
      agreement_days: finalAgreementDays
    });

    // Step 6: Initial Compliance Status Evaluation
    const { status: initialStatus } = evaluateComplianceStatus({
      computed_deadline,
      payment_date: null,
      as_of_date: formatDateUTC(new Date()),
      alert_lead_time_days: alertLeadTimeDays
    });

    // Step 7: Persist Invoice Record
    const { data: invoice, error: insertError } = await req.supabase
      .from('invoices')
      .insert({
        org_id: req.org_id,
        vendor_id: vendorId,
        file_path: filePath,
        raw_extracted: extractedData,
        invoice_number: extractedData.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
        amount: extractedData.amount || 0.00,
        currency: extractedData.currency || 'INR',
        acceptance_date: finalAcceptanceDate,
        po_number: extractedData.po_number || null,
        agreement_basis: finalAgreementBasis,
        agreement_days: finalAgreementDays,
        computed_deadline,
        status: initialStatus
      })
      .select(`
        *,
        vendors ( id, name, email, udyam_category, udyam_registration_number )
      `)
      .single();

    if (insertError || !invoice) {
      return res.status(500).json({
        error: 'Insert Failed',
        message: 'Failed to record invoice.',
        details: insertError?.message
      });
    }

    // Step 8: Log Audit Trail for AI Extraction and Statutory Computation
    await logAuditEvent({
      supabase: req.supabase,
      org_id: req.org_id,
      actor: 'ai',
      action: 'extraction',
      target_table: 'invoices',
      target_id: invoice.id,
      metadata: {
        confidence: extractedData.confidence,
        missing_fields: extractedData.missing_fields,
        invoice_number: invoice.invoice_number
      }
    });

    await logAuditEvent({
      supabase: req.supabase,
      org_id: req.org_id,
      actor: 'system',
      action: 'deadline_computed',
      target_table: 'invoices',
      target_id: invoice.id,
      metadata: {
        statutory_window_days: applicable_window_days,
        computed_deadline,
        basis: finalAgreementBasis
      }
    });

    // Step 9: Proactive Udyam Verification Flow
    // If vendor category is unknown or missing certificate, draft declaration request
    let declarationDraft = null;
    if (vendor && (vendor.udyam_category === 'unknown' || !vendor.udyam_registration_number)) {
      const draft = await draftDeclarationRequest({
        vendor_name: vendor.name,
        request_count: 0
      });

      const { data: draftRecord } = await req.supabase
        .from('declaration_requests')
        .insert({
          org_id: req.org_id,
          vendor_id: vendor.id,
          direction: orgSettings?.auto_send_declarations ? 'outbound_sent' : 'outbound_draft',
          subject: draft.subject,
          body: draft.body,
          approved_by: orgSettings?.auto_send_declarations ? req.user.id : null
        })
        .select()
        .single();

      declarationDraft = draftRecord;

      if (orgSettings?.auto_send_declarations) {
        await sendEmail({
          to: vendor.email,
          subject: draft.subject,
          text: draft.body
        });
      }
    }

    return res.status(201).json({
      message: 'Invoice ingested and compliance deadline computed successfully.',
      invoice,
      statutory_compliance: {
        applicable_window_days,
        computed_deadline,
        status: initialStatus
      },
      declaration_draft: declarationDraft
    });
  } catch (err) {
    console.error('[UPLOAD_INVOICE_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function getInvoice(req, res) {
  try {
    const { id } = req.params;

    const { data: invoice, error } = await req.supabase
      .from('invoices')
      .select(`
        *,
        vendors (*),
        interest_calculations (*)
      `)
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return res.status(404).json({ error: 'Not Found', message: 'Invoice not found.' });
    }

    // Generate signed download URL if file exists in Supabase Storage
    let signedUrl = null;
    if (invoice.file_path && !invoice.file_path.startsWith('local_mock_storage')) {
      try {
        const { data: signedData } = await req.supabase.storage
          .from('nudge-documents')
          .createSignedUrl(invoice.file_path, 3600); // 1 hour validity
        signedUrl = signedData?.signedUrl;
      } catch (urlErr) {
        console.warn('Storage signed URL generation warning:', urlErr.message);
      }
    }

    // Refresh dynamic status
    const today = formatDateUTC(new Date());
    const evalResult = evaluateComplianceStatus({
      computed_deadline: invoice.computed_deadline,
      payment_date: invoice.payment_date,
      as_of_date: today
    });

    return res.json({
      invoice: {
        ...invoice,
        signed_file_url: signedUrl,
        live_status: evalResult.status,
        days_to_breach: evalResult.days_to_breach,
        is_breached: evalResult.is_breached
      }
    });
  } catch (err) {
    console.error('[GET_INVOICE_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function updateInvoice(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Fetch existing invoice
    const { data: existing, error: fetchErr } = await req.supabase
      .from('invoices')
      .select('*, vendors(*)')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Invoice not found.' });
    }

    const acceptance_date = updates.acceptance_date || existing.acceptance_date;
    const agreement_basis = updates.agreement_basis || existing.agreement_basis;
    const agreement_days = updates.agreement_days !== undefined ? updates.agreement_days : existing.agreement_days;
    const payment_date = updates.payment_date !== undefined ? updates.payment_date : existing.payment_date;

    // Recompute deadline deterministically
    const { computed_deadline, applicable_window_days } = computeStatutoryDeadline({
      acceptance_date,
      agreement_basis,
      agreement_days
    });

    // Re-evaluate compliance status
    const { status: newStatus } = evaluateComplianceStatus({
      computed_deadline,
      payment_date,
      as_of_date: formatDateUTC(new Date())
    });

    const payload = {
      ...updates,
      acceptance_date,
      agreement_basis,
      agreement_days,
      computed_deadline,
      payment_date,
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    const { data: updated, error: updateErr } = await req.supabase
      .from('invoices')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        vendors (*),
        interest_calculations (*)
      `)
      .single();

    if (updateErr) {
      return res.status(500).json({ error: 'Update Failed', message: updateErr.message });
    }

    // If invoice breached or paid late, compute statutory MSMED interest
    if (newStatus === 'breached' || newStatus === 'paid_late') {
      const { data: orgSettings } = await req.supabase
        .from('org_settings')
        .select('rbi_bank_rate')
        .eq('org_id', req.org_id)
        .maybeSingle();

      const rbiRate = orgSettings?.rbi_bank_rate || 6.50;
      const interestResult = calculateMSMEDInterest({
        principal_amount: updated.amount,
        computed_deadline: updated.computed_deadline,
        payment_date: updated.payment_date,
        as_of_date: formatDateUTC(new Date()),
        rbi_bank_rate: rbiRate
      });

      // Upsert interest calculation
      await req.supabase
        .from('interest_calculations')
        .delete()
        .eq('invoice_id', id);

      await req.supabase
        .from('interest_calculations')
        .insert({
          invoice_id: id,
          org_id: req.org_id,
          rbi_bank_rate: rbiRate,
          applicable_rate: interestResult.applicable_rate,
          days_overdue: interestResult.days_overdue,
          interest_amount: interestResult.interest_amount,
          calculated_at: new Date().toISOString()
        });
    }

    await logAuditEvent({
      supabase: req.supabase,
      org_id: req.org_id,
      actor: req.user.id,
      action: 'invoice_updated',
      target_table: 'invoices',
      target_id: id,
      metadata: { fields_updated: Object.keys(updates), new_status: newStatus }
    });

    return res.json({
      message: 'Invoice updated and statutory compliance re-evaluated.',
      invoice: updated
    });
  } catch (err) {
    console.error('[UPDATE_INVOICE_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function recomputeInvoice(req, res) {
  try {
    const { id } = req.params;
    const { data: invoice } = await req.supabase
      .from('invoices')
      .select('*, org_settings(*)')
      .eq('id', id)
      .single();

    if (!invoice) {
      return res.status(404).json({ error: 'Not Found', message: 'Invoice not found.' });
    }

    const { computed_deadline } = computeStatutoryDeadline({
      acceptance_date: invoice.acceptance_date,
      agreement_basis: invoice.agreement_basis,
      agreement_days: invoice.agreement_days
    });

    const { status } = evaluateComplianceStatus({
      computed_deadline,
      payment_date: invoice.payment_date,
      as_of_date: formatDateUTC(new Date())
    });

    await req.supabase
      .from('invoices')
      .update({ computed_deadline, status, updated_at: new Date().toISOString() })
      .eq('id', id);

    return res.json({ message: 'Recomputation completed.', computed_deadline, status });
  } catch (err) {
    console.error('[RECOMPUTE_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function deleteInvoice(req, res) {
  try {
    const { id } = req.params;

    // Verify invoice exists and belongs to user's org
    const { data: invoice, error: fetchErr } = await req.supabase
      .from('invoices')
      .select('*, vendors(name)')
      .eq('id', id)
      .eq('org_id', req.org_id)
      .single();

    if (fetchErr || !invoice) {
      return res.status(404).json({ error: 'Not Found', message: 'Invoice not found.' });
    }

    // Attempt to remove file from Supabase storage if exists
    if (invoice.file_path && !invoice.file_path.startsWith('local_mock_storage')) {
      try {
        await req.supabase.storage
          .from('nudge-documents')
          .remove([invoice.file_path]);
      } catch (storageErr) {
        console.warn('Storage file deletion warning:', storageErr.message);
      }
    }

    // Delete invoice from database (cascades to interest_calculations and alerts)
    const { error: deleteErr } = await req.supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('org_id', req.org_id);

    if (deleteErr) {
      return res.status(500).json({ error: 'Delete Failed', message: deleteErr.message });
    }

    // Log immutable audit event
    await logAuditEvent({
      supabase: req.supabase,
      org_id: req.org_id,
      actor: req.user.id,
      action: 'invoice_deleted',
      target_table: 'invoices',
      target_id: id,
      metadata: {
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        vendor_name: invoice.vendors?.name,
        reason: 'User deletion (uploaded by mistake or cancelled)'
      }
    });

    return res.json({
      message: 'Invoice and associated compliance records deleted successfully.',
      id
    });
  } catch (err) {
    console.error('[DELETE_INVOICE_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function extractInvoicePreview(req, res) {
  try {
    const file = req.file;
    let documentText = req.body.document_text || '';

    if (!file && !documentText) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No invoice document file or document_text provided.'
      });
    }

    if (file && !documentText) {
      documentText = file.mimetype === 'text/plain' && file.buffer ? file.buffer.toString('utf8') : '';
    }

    const extractedData = await extractInvoiceData({
      fileBuffer: file?.buffer,
      mimeType: file?.mimetype,
      fileName: file?.originalname,
      documentText
    });

    let matchedVendor = null;
    if (extractedData.vendor_name) {
      const trimmedName = extractedData.vendor_name.trim();

      const { data: existingVendor } = await req.supabase
        .from('vendors')
        .select('*')
        .eq('org_id', req.org_id)
        .ilike('name', trimmedName)
        .maybeSingle();

      if (existingVendor) {
        matchedVendor = existingVendor;
      } else {
        const { data: allVendors } = await req.supabase
          .from('vendors')
          .select('*')
          .eq('org_id', req.org_id);

        const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetClean = cleanStr(trimmedName);

        matchedVendor = (allVendors || []).find(v => {
          const vClean = cleanStr(v.name);
          return vClean && (targetClean.includes(vClean) || vClean.includes(targetClean));
        }) || null;
      }
    }

    return res.json({
      extracted: extractedData,
      matched_vendor: matchedVendor,
      suggested_vendor_name: extractedData.vendor_name
    });
  } catch (err) {
    console.error('[EXTRACT_PREVIEW_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}


