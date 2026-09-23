// ====================================================================
// Nudge: Vendors Controller
// Manages vendor master, Udyam MSME classification, AI declaration
// request drafting, human approval gate, certificate parsing, and email webhook.
// ====================================================================

import {
  classifyUdyamCertificate,
  draftDeclarationRequest,
  parseVendorReply
} from '../services/ai.service.js';
import { logAuditEvent } from '../services/audit.service.js';
import { sendEmail } from '../services/email.service.js';

export async function listVendors(req, res) {
  try {
    const { category, search } = req.query;

    let query = req.supabase
      .from('vendors')
      .select(`
        *,
        invoices ( id, amount, status, computed_deadline )
      `)
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('udyam_category', category);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,udyam_registration_number.ilike.%${search}%`);
    }

    const { data: vendors, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Database Query Failed', message: error.message });
    }

    // Enrich with computed invoice counts and exposure
    const enriched = (vendors || []).map(v => {
      const openInvoices = (v.invoices || []).filter(i => !['paid_on_time', 'paid_late'].includes(i.status));
      const totalExposure = openInvoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      const breachedCount = openInvoices.filter(i => i.status === 'breached').length;

      return {
        ...v,
        open_invoices_count: openInvoices.length,
        total_open_exposure: Number(totalExposure.toFixed(2)),
        breached_invoices_count: breachedCount
      };
    });

    return res.json({ data: enriched });
  } catch (err) {
    console.error('[LIST_VENDORS_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function createVendor(req, res) {
  try {
    const { name, email, udyam_category, udyam_registration_number } = req.body;

    const { data: vendor, error } = await req.supabase
      .from('vendors')
      .insert({
        org_id: req.org_id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        udyam_category: udyam_category || 'unknown',
        udyam_registration_number: udyam_registration_number?.trim() || null
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Create Failed', message: error.message });
    }

    await logAuditEvent({
      supabase: req.supabase,
      org_id: req.org_id,
      actor: req.user.id,
      action: 'vendor_created',
      target_table: 'vendors',
      target_id: vendor.id,
      metadata: { vendor_name: vendor.name, category: vendor.udyam_category }
    });

    return res.status(201).json({ message: 'Vendor created successfully.', vendor });
  } catch (err) {
    console.error('[CREATE_VENDOR_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function getVendor(req, res) {
  try {
    const { id } = req.params;

    const { data: vendor, error } = await req.supabase
      .from('vendors')
      .select(`
        *,
        declaration_requests (*),
        invoices (*, interest_calculations (*))
      `)
      .eq('id', id)
      .single();

    if (error || !vendor) {
      return res.status(404).json({ error: 'Not Found', message: 'Vendor not found.' });
    }

    // Generate signed download URL for Udyam certificate if available
    let signedCertificateUrl = null;
    if (vendor.udyam_certificate_path && !vendor.udyam_certificate_path.startsWith('local_mock_storage')) {
      try {
        const { data: signedData } = await req.supabase.storage
          .from('nudge-documents')
          .createSignedUrl(vendor.udyam_certificate_path, 3600);
        signedCertificateUrl = signedData?.signedUrl;
      } catch (e) {
        console.warn('Could not generate signed cert URL:', e.message);
      }
    }

    return res.json({
      vendor: {
        ...vendor,
        signed_certificate_url: signedCertificateUrl
      }
    });
  } catch (err) {
    console.error('[GET_VENDORS_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function uploadCertificate(req, res) {
  try {
    const { id } = req.params;
    const file = req.file;

    const { data: vendor, error: fetchErr } = await req.supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !vendor) {
      return res.status(404).json({ error: 'Not Found', message: 'Vendor not found.' });
    }

    let certificateText = '';
    let certPath = null;

    if (file) {
      certificateText = file.buffer ? file.buffer.toString('utf8') : '';
      if (!certificateText || certificateText.length < 10) {
        certificateText = `Udyam Certificate File: ${file.originalname}\nVendor: ${vendor.name}\nDate: ${new Date().toISOString().slice(0,10)}`;
      }

      try {
        const fileName = `certificates/${req.org_id}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { data: stData, error: stErr } = await req.supabase.storage
          .from('nudge-documents')
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        certPath = (!stErr && stData) ? stData.path : `local_mock_storage/${fileName}`;
      } catch (e) {
        certPath = `local_mock_storage/${file.originalname}`;
      }
    } else if (req.body.certificate_text) {
      certificateText = req.body.certificate_text;
    } else {
      return res.status(400).json({ error: 'Bad Request', message: 'No certificate file or certificate_text provided.' });
    }

    // Call Gemini to classify certificate (multimodal support for PDF/image)
    const classification = await classifyUdyamCertificate({
      fileBuffer: file?.buffer,
      mimeType: file?.mimetype,
      certificateText
    });

    // Update vendor record
    const { data: updated, error: updateErr } = await req.supabase
      .from('vendors')
      .update({
        udyam_category: classification.category,
        udyam_registration_number: classification.udyam_registration_number || vendor.udyam_registration_number,
        udyam_certificate_path: certPath,
        udyam_verified_at: classification.valid ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ error: 'Update Failed', message: updateErr.message });
    }

    await logAuditEvent({
      supabase: req.supabase,
      org_id: req.org_id,
      actor: 'ai',
      action: 'udyam_classification',
      target_table: 'vendors',
      target_id: id,
      metadata: {
        category: classification.category,
        udyam_number: classification.udyam_registration_number,
        confidence: classification.confidence
      }
    });

    return res.json({
      message: 'Udyam certificate classified and verified.',
      vendor: updated,
      classification
    });
  } catch (err) {
    console.error('[UPLOAD_CERT_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function requestDeclaration(req, res) {
  try {
    const { id } = req.params;

    const { data: vendor, error: fetchErr } = await req.supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !vendor) {
      return res.status(404).json({ error: 'Not Found', message: 'Vendor not found.' });
    }

    // Count prior requests
    const { count } = await req.supabase
      .from('declaration_requests')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', id);

    // Fetch org settings
    const { data: orgSettings } = await req.supabase
      .from('org_settings')
      .select('*')
      .eq('org_id', req.org_id)
      .maybeSingle();

    // Call Gemini to draft declaration email
    const draft = await draftDeclarationRequest({
      vendor_name: vendor.name,
      request_count: count || 0
    });

    const isAutoSend = Boolean(orgSettings?.auto_send_declarations);

    const { data: declarationRecord, error: insertErr } = await req.supabase
      .from('declaration_requests')
      .insert({
        org_id: req.org_id,
        vendor_id: id,
        direction: isAutoSend ? 'outbound_sent' : 'outbound_draft',
        subject: draft.subject,
        body: draft.body,
        approved_by: isAutoSend ? req.user.id : null
      })
      .select()
      .single();

    if (insertErr) {
      return res.status(500).json({ error: 'Failed to save declaration draft', message: insertErr.message });
    }

    await logAuditEvent({
      supabase: req.supabase,
      org_id: req.org_id,
      actor: 'ai',
      action: 'declaration_drafted',
      target_table: 'declaration_requests',
      target_id: declarationRecord.id,
      metadata: { vendor_id: id, auto_send: isAutoSend }
    });

    if (isAutoSend) {
      await sendEmail({
        to: vendor.email,
        subject: draft.subject,
        text: draft.body
      });

      await logAuditEvent({
        supabase: req.supabase,
        org_id: req.org_id,
        actor: req.user.id,
        action: 'declaration_sent',
        target_table: 'declaration_requests',
        target_id: declarationRecord.id,
        metadata: { vendor_email: vendor.email, auto_send: true }
      });
    }

    return res.status(201).json({
      message: isAutoSend ? 'Declaration request dispatched.' : 'Declaration request draft created for review.',
      declaration: declarationRecord,
      auto_sent: isAutoSend
    });
  } catch (err) {
    console.error('[REQUEST_DECLARATION_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function approveDeclaration(req, res) {
  try {
    const { id } = req.params; // vendor_id
    const { declaration_id, subject, body, recipient_email } = req.body;

    const { data: vendor, error: vendorErr } = await req.supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (vendorErr || !vendor) {
      return res.status(404).json({ error: 'Not Found', message: 'Vendor not found.' });
    }

    const toEmail = recipient_email || vendor.email;

    // Dispatch email
    const emailResult = await sendEmail({
      to: toEmail,
      subject,
      text: body
    });

    let declarationRecord = null;

    if (declaration_id) {
      const { data: updated } = await req.supabase
        .from('declaration_requests')
        .update({
          direction: 'outbound_sent',
          subject,
          body,
          approved_by: req.user.id,
          created_at: new Date().toISOString()
        })
        .eq('id', declaration_id)
        .select()
        .single();
      declarationRecord = updated;
    } else {
      const { data: inserted } = await req.supabase
        .from('declaration_requests')
        .insert({
          org_id: req.org_id,
          vendor_id: id,
          direction: 'outbound_sent',
          subject,
          body,
          approved_by: req.user.id
        })
        .select()
        .single();
      declarationRecord = inserted;
    }

    await logAuditEvent({
      supabase: req.supabase,
      org_id: req.org_id,
      actor: req.user.id,
      action: 'declaration_sent',
      target_table: 'declaration_requests',
      target_id: declarationRecord?.id,
      metadata: { recipient: toEmail, simulated: emailResult.simulated }
    });

    return res.json({
      message: 'Declaration request approved and sent.',
      declaration: declarationRecord,
      email_status: emailResult
    });
  } catch (err) {
    console.error('[APPROVE_DECLARATION_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function handleInboundWebhook(req, res) {
  try {
    const { from_email, body: emailBody, org_id: targetOrgId } = req.body;

    if (!from_email || !emailBody || !targetOrgId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required webhook fields: from_email, body, org_id.'
      });
    }

    // Explicit manual tenant validation with admin client
    const { data: vendor } = await req.supabaseAdmin
      .from('vendors')
      .select('*')
      .eq('org_id', targetOrgId)
      .ilike('email', from_email.trim())
      .maybeSingle();

    if (!vendor) {
      return res.status(404).json({ error: 'Not Found', message: 'No matching vendor found for inbound sender.' });
    }

    // Call Gemini to parse vendor reply
    const parseResult = await parseVendorReply(emailBody);

    // Save inbound reply to declaration_requests
    await req.supabaseAdmin
      .from('declaration_requests')
      .insert({
        org_id: targetOrgId,
        vendor_id: vendor.id,
        direction: 'inbound_reply',
        subject: `Re: Udyam MSME Declaration from ${vendor.name}`,
        body: emailBody
      });

    // If Udyam info found, update vendor category
    if (parseResult.contains_udyam_info && parseResult.category_stated) {
      await req.supabaseAdmin
        .from('vendors')
        .update({
          udyam_category: parseResult.category_stated,
          udyam_registration_number: parseResult.udyam_registration_number || vendor.udyam_registration_number
        })
        .eq('id', vendor.id);
    }

    await logAuditEvent({
      supabase: req.supabaseAdmin,
      org_id: targetOrgId,
      actor: 'ai',
      action: 'vendor_reply_parsed',
      target_table: 'vendors',
      target_id: vendor.id,
      metadata: {
        contains_udyam: parseResult.contains_udyam_info,
        category: parseResult.category_stated
      }
    });

    return res.json({ message: 'Inbound vendor reply processed.', parseResult });
  } catch (err) {
    console.error('[WEBHOOK_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
