// ====================================================================
// Nudge: Natural-Language Compliance Assistant Controller
// Strictly scoped to the organization's own compliance data snapshot.
// Prohibited from computing or estimating deadlines/interest.
// ====================================================================

import { queryComplianceAssistant } from '../services/ai.service.js';
import { logAuditEvent } from '../services/audit.service.js';
import { formatDateUTC, evaluateComplianceStatus } from '../services/compliance.service.js';

export async function askAssistant(req, res) {
  try {
    const { query } = req.body;
    const today = formatDateUTC(new Date());

    // 1. Compile structured snapshot strictly scoped to this organization
    const { data: invoices, error: invErr } = await req.supabase
      .from('invoices')
      .select(`
        id, invoice_number, amount, acceptance_date, agreement_basis,
        agreement_days, computed_deadline, payment_date, status,
        vendors ( id, name, udyam_category, udyam_registration_number ),
        interest_calculations ( applicable_rate, days_overdue, interest_amount )
      `)
      .order('computed_deadline', { ascending: true });

    if (invErr) {
      return res.status(500).json({ error: 'Database Query Failed', message: invErr.message });
    }

    const { data: orgSettings } = await req.supabase
      .from('org_settings')
      .select('*')
      .eq('org_id', req.org_id)
      .maybeSingle();

    // Compute live aggregates
    let totalExposureAtRisk = 0;
    let totalBreachedAmount = 0;
    let totalAccruedInterest = 0;
    const activeInvoices = [];

    for (const inv of invoices || []) {
      const evalRes = evaluateComplianceStatus({
        computed_deadline: inv.computed_deadline,
        payment_date: inv.payment_date,
        as_of_date: today,
        alert_lead_time_days: orgSettings?.alert_lead_time_days || 5
      });

      const amount = Number(inv.amount) || 0;
      const interest = inv.interest_calculations?.[0]?.interest_amount || 0;

      if (evalRes.status === 'at_risk') totalExposureAtRisk += amount;
      if (evalRes.status === 'breached') {
        totalBreachedAmount += amount;
        totalAccruedInterest += interest;
      }

      activeInvoices.push({
        id: inv.id,
        invoice_number: inv.invoice_number,
        vendor: inv.vendors?.name || 'Unknown',
        udyam_category: inv.vendors?.udyam_category || 'unknown',
        amount,
        computed_deadline: inv.computed_deadline,
        days_to_breach: evalRes.days_to_breach,
        status: evalRes.status,
        accrued_interest: interest
      });
    }

    const orgSnapshot = {
      as_of_date: today,
      organization_id: req.org_id,
      rbi_bank_rate_configured: orgSettings?.rbi_bank_rate || 6.50,
      total_invoices_count: invoices?.length || 0,
      total_43bh_disallowance_exposure_inr: Number((totalExposureAtRisk + totalBreachedAmount).toFixed(2)),
      total_breached_principal_inr: Number(totalBreachedAmount.toFixed(2)),
      total_accrued_msmed_interest_inr: Number(totalAccruedInterest.toFixed(2)),
      invoices: activeInvoices.slice(0, 50) // Top 50 nearest deadlines
    };

    // 2. Call Gemini Assistant with untrusted data fencing and strict validation
    const aiResponse = await queryComplianceAssistant({
      org_data_snapshot: orgSnapshot,
      user_question: query
    });

    // 3. Log Audit Trail
    await logAuditEvent({
      supabase: req.supabase,
      org_id: req.org_id,
      actor: req.user.id,
      action: 'nl_query',
      metadata: {
        query_snippet: query.slice(0, 100),
        confidence: aiResponse.confidence,
        supporting_invoices_count: aiResponse.supporting_invoice_ids.length
      }
    });

    return res.json({
      query,
      answer: aiResponse.answer,
      supporting_invoice_ids: aiResponse.supporting_invoice_ids,
      confidence: aiResponse.confidence,
      org_metrics: {
        total_invoices: orgSnapshot.total_invoices_count,
        disallowance_exposure: orgSnapshot.total_43bh_disallowance_exposure_inr,
        accrued_interest: orgSnapshot.total_accrued_msmed_interest_inr
      }
    });
  } catch (err) {
    console.error('[ASSISTANT_QUERY_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
