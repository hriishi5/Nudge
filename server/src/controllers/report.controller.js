// ====================================================================
// Nudge: Form 3CD Clause 22 Report Controller
// Generates statutory disclosure summaries aligned with Tax Audit Form 3CD
// under the Income Tax Act, 1961 and Section 22 of the MSMED Act, 2006.
// ====================================================================

import { formatDateUTC, evaluateComplianceStatus, isSection43BhApplicable, computeStatutoryDeadline } from '../services/compliance.service.js';

export async function getForm3CDReport(req, res) {
  try {
    const { year, format } = req.query;
    const today = formatDateUTC(new Date());

    // Fetch all invoices for MSME vendors (Micro and Small)
    const { data: invoices, error } = await req.supabase
      .from('invoices')
      .select(`
        *,
        vendors (*),
        interest_calculations (*)
      `)
      .order('acceptance_date', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Database Query Failed', message: error.message });
    }

    // Filter to Section 43B(h) applicable vendors (Micro & Small)
    const msmeInvoices = (invoices || []).filter(inv => {
      const cat = inv.vendors?.udyam_category || 'unknown';
      return isSection43BhApplicable(cat);
    });

    let clause22_a_principal_unpaid = 0;
    let clause22_b_interest_due = 0;
    let clause22_c_interest_paid_late = 0;
    let clause22_d_interest_accrued_unpaid = 0;
    let total_disallowance_exposure = 0;

    const lineItems = msmeInvoices.map(inv => {
      const rawAcceptance = inv.acceptance_date ? String(inv.acceptance_date).trim().slice(0, 10) : '';
      let deadline = inv.computed_deadline ? String(inv.computed_deadline).trim().slice(0, 10) : '';

      // If deadline is missing but acceptance date is present, calculate deterministically
      if (!deadline && rawAcceptance) {
        try {
          const comp = computeStatutoryDeadline({
            acceptance_date: rawAcceptance,
            agreement_basis: inv.agreement_basis || 'no_agreement',
            agreement_days: inv.agreement_days
          });
          deadline = comp.computed_deadline || '';
        } catch (e) {
          deadline = '';
        }
      }

      const rawPayment = inv.payment_date && inv.payment_date !== 'Unpaid' 
        ? String(inv.payment_date).trim().slice(0, 10) 
        : null;

      const evalRes = evaluateComplianceStatus({
        computed_deadline: deadline,
        payment_date: rawPayment,
        as_of_date: today
      });

      const principal = Number(inv.amount) || 0;
      const interestObj = inv.interest_calculations?.[0] || null;
      const interestAmount = interestObj ? Number(interestObj.interest_amount) : 0;
      const daysOverdue = interestObj ? interestObj.days_overdue : 0;

      const isBreached = evalRes.status === 'breached';
      const isPaidLate = evalRes.status === 'paid_late';

      if (!rawPayment) {
        clause22_a_principal_unpaid += principal;
        clause22_b_interest_due += interestAmount;
        clause22_d_interest_accrued_unpaid += interestAmount;
      }

      if (isPaidLate) {
        clause22_c_interest_paid_late += interestAmount;
      }

      if (isBreached) {
        total_disallowance_exposure += principal;
      }

      return {
        id: inv.id,
        vendor_name: inv.vendors?.name || 'Unknown',
        udyam_registration_number: inv.vendors?.udyam_registration_number || 'Pending Verification',
        udyam_category: inv.vendors?.udyam_category || 'unknown',
        invoice_number: inv.invoice_number,
        acceptance_date: rawAcceptance,
        agreement_basis: inv.agreement_basis,
        statutory_window_days: inv.agreement_basis === 'written_agreement' ? Math.min(inv.agreement_days || 45, 45) : 15,
        computed_deadline: deadline,
        payment_date: rawPayment || 'Unpaid',
        principal_amount: principal,
        status: evalRes.status,
        days_overdue: daysOverdue,
        accrued_msmed_interest: interestAmount,
        section_43bh_disallowance_inr: isBreached ? principal : 0
      };
    });

    const summary = {
      financial_year: year || `FY ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      generated_at: new Date().toISOString(),
      clause_22_disclosures: {
        item_a_principal_remaining_unpaid: Number(clause22_a_principal_unpaid.toFixed(2)),
        item_b_interest_due_thereon: Number(clause22_b_interest_due.toFixed(2)),
        item_c_interest_paid_beyond_appointed_day: Number(clause22_c_interest_paid_late.toFixed(2)),
        item_d_interest_accrued_and_remaining_unpaid: Number(clause22_d_interest_accrued_unpaid.toFixed(2)),
        item_e_further_interest_due_succeeding_years: Number(clause22_d_interest_accrued_unpaid.toFixed(2)),
        total_section_43bh_disallowance_risk: Number(total_disallowance_exposure.toFixed(2))
      },
      line_items: lineItems
    };

    if (format === 'csv') {
      let csv = 'Vendor Name,Udyam Number,Category,Invoice No,Acceptance Date,Statutory Days,Deadline,Payment Date,Principal (INR),Status,Days Overdue,MSMED Interest (INR),43B(h) Disallowance\n';
      for (const item of lineItems) {
        const accDate = item.acceptance_date || '—';
        const dline = item.computed_deadline || '—';
        const pdate = item.payment_date || 'Unpaid';
        csv += `"${item.vendor_name}","${item.udyam_registration_number}","${item.udyam_category}","${item.invoice_number}","${accDate}",${item.statutory_window_days},"${dline}","${pdate}",${item.principal_amount},"${item.status}",${item.days_overdue},${item.accrued_msmed_interest},${item.section_43bh_disallowance_inr}\n`;
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Disposition', 'attachment; filename="form_3cd_clause_22.csv"');
      return res.send(csv);
    }

    return res.json(summary);
  } catch (err) {
    console.error('[FORM_3CD_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
