// ====================================================================
// Nudge: Scheduled Compliance Jobs Controller
// Daily background scanner for payment deadlines, proactive alerts,
// and deterministic MSMED Section 16 penal interest computation.
//
// Authenticated via SCHEDULED_JOB_SECRET (no user session).
// ====================================================================

import {
  evaluateComplianceStatus,
  calculateMSMEDInterest,
  formatDateUTC,
  isSection43BhApplicable
} from '../services/compliance.service.js';
import { logAuditEvent } from '../services/audit.service.js';

export async function scanDeadlines(req, res) {
  try {
    const today = formatDateUTC(new Date());
    const admin = req.supabaseAdmin;

    // 1. Fetch all organizations with their compliance settings
    const { data: orgs, error: orgsErr } = await admin
      .from('organizations')
      .select('id, name, org_settings(*)');

    if (orgsErr) {
      return res.status(500).json({ error: 'Failed to retrieve organizations', message: orgsErr.message });
    }

    let totalInvoicesScanned = 0;
    let alertsRaisedCount = 0;
    let interestCalculationsCount = 0;
    const scanSummary = [];

    for (const org of orgs || []) {
      const settings = Array.isArray(org.org_settings) ? org.org_settings[0] : org.org_settings;
      const alertLeadTime = settings?.alert_lead_time_days || 5;
      const rbiRate = settings?.rbi_bank_rate || 6.50;

      // Fetch all open (unpaid) invoices for this tenant
      const { data: openInvoices, error: invErr } = await admin
        .from('invoices')
        .select(`
          id, invoice_number, amount, acceptance_date, computed_deadline,
          status, vendor_id,
          vendors ( id, name, udyam_category )
        `)
        .eq('org_id', org.id)
        .is('payment_date', null);

      if (invErr || !openInvoices) continue;

      let orgAlerts = 0;
      let orgBreaches = 0;

      for (const invoice of openInvoices) {
        totalInvoicesScanned++;

        const evalResult = evaluateComplianceStatus({
          computed_deadline: invoice.computed_deadline,
          payment_date: null,
          as_of_date: today,
          alert_lead_time_days: alertLeadTime
        });

        const newStatus = evalResult.status;
        const vendorCategory = invoice.vendors?.udyam_category || 'unknown';
        const is43BhTarget = isSection43BhApplicable(vendorCategory);

        // Update status if changed
        if (newStatus !== invoice.status) {
          await admin
            .from('invoices')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', invoice.id);
        }

        // Handle AT_RISK status
        if (newStatus === 'at_risk' && is43BhTarget) {
          const daysLeft = evalResult.days_to_breach;
          const severity = daysLeft <= 3 ? 'critical' : (daysLeft <= 7 ? 'warning' : 'info');
          const message = `Payment deadline for Invoice ${invoice.invoice_number} (₹${invoice.amount}) to ${invoice.vendors?.name || 'vendor'} is in ${daysLeft} days. Approaching Section 43B(h) disallowance threshold.`;

          // Check if unacknowledged alert of this severity already exists
          const { data: existingAlert } = await admin
            .from('alerts')
            .select('id')
            .eq('invoice_id', invoice.id)
            .eq('severity', severity)
            .eq('acknowledged', false)
            .maybeSingle();

          if (!existingAlert) {
            await admin
              .from('alerts')
              .insert({
                invoice_id: invoice.id,
                org_id: org.id,
                severity,
                message,
                acknowledged: false
              });
            alertsRaisedCount++;
            orgAlerts++;
          }
        }

        // Handle BREACHED status
        if (newStatus === 'breached' && is43BhTarget) {
          orgBreaches++;

          // Deterministic MSMED interest calculation (Section 16: 3x RBI rate, monthly compounding)
          const interestResult = calculateMSMEDInterest({
            principal_amount: invoice.amount,
            computed_deadline: invoice.computed_deadline,
            payment_date: null,
            as_of_date: today,
            rbi_bank_rate: rbiRate
          });

          // Refresh interest_calculations row
          await admin
            .from('interest_calculations')
            .delete()
            .eq('invoice_id', invoice.id);

          await admin
            .from('interest_calculations')
            .insert({
              invoice_id: invoice.id,
              org_id: org.id,
              rbi_bank_rate: rbiRate,
              applicable_rate: interestResult.applicable_rate,
              days_overdue: interestResult.days_overdue,
              interest_amount: interestResult.interest_amount,
              calculated_at: new Date().toISOString()
            });

          interestCalculationsCount++;

          // Create critical breach alert if not already logged
          const breachMsg = `CRITICAL: Payment breached for Invoice ${invoice.invoice_number} (₹${invoice.amount}) to ${invoice.vendors?.name || 'vendor'}. Section 43B(h) tax disallowance active. Overdue by ${interestResult.days_overdue} days. Accrued statutory MSMED interest: ₹${interestResult.interest_amount} (at ${interestResult.applicable_rate}%).`;

          const { data: existingBreachAlert } = await admin
            .from('alerts')
            .select('id')
            .eq('invoice_id', invoice.id)
            .eq('severity', 'critical')
            .eq('acknowledged', false)
            .maybeSingle();

          if (!existingBreachAlert) {
            await admin
              .from('alerts')
              .insert({
                invoice_id: invoice.id,
                org_id: org.id,
                severity: 'critical',
                message: breachMsg,
                acknowledged: false
              });
            alertsRaisedCount++;
            orgAlerts++;
          }
        }
      }

      // Log scheduled job run in audit trail for this organization
      await logAuditEvent({
        supabase: admin,
        org_id: org.id,
        actor: 'system',
        action: 'scan_deadlines_job',
        metadata: {
          scanned: openInvoices.length,
          alerts_raised: orgAlerts,
          breaches_detected: orgBreaches,
          as_of_date: today
        }
      });

      scanSummary.push({
        org_id: org.id,
        org_name: org.name,
        scanned: openInvoices.length,
        alerts: orgAlerts,
        breaches: orgBreaches
      });
    }

    return res.json({
      message: 'Daily deadline compliance scan completed successfully.',
      scan_date: today,
      total_invoices_scanned: totalInvoicesScanned,
      alerts_raised: alertsRaisedCount,
      interest_calculations_performed: interestCalculationsCount,
      summary: scanSummary
    });
  } catch (err) {
    console.error('[SCAN_DEADLINES_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
