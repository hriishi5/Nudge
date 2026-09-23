// ====================================================================
// Nudge: Deterministic Statutory Compliance Engine
// Implements statutory logic for Section 43B(h) of the Income Tax Act, 1961
// and Sections 15 & 16 of the MSMED Act, 2006.
//
// CRITICAL ARCHITECTURAL DIRECTIVE:
// Under no circumstances should deadline or interest calculations
// be performed by or delegated to an LLM. All calculations here
// are deterministic, reproducible, and verifiable.
// ====================================================================

/**
 * Parses a YYYY-MM-DD string into a UTC Date object
 * @param {string} dateStr 
 * @returns {Date}
 */
export function parseDateUTC(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Formats a Date object to YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateUTC(date) {
  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Adds an exact integer number of calendar days to a YYYY-MM-DD date string
 * @param {string} dateStr 
 * @param {number} days 
 * @returns {string} YYYY-MM-DD
 */
export function addDays(dateStr, days) {
  const date = parseDateUTC(dateStr);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateUTC(date);
}

/**
 * Calculates the exact difference in days between two YYYY-MM-DD dates (d2 - d1)
 * Positive if d2 is after d1.
 * @param {string} dateStr1 
 * @param {string} dateStr2 
 * @returns {number}
 */
export function differenceInDays(dateStr1, dateStr2) {
  const d1 = parseDateUTC(dateStr1);
  const d2 = parseDateUTC(dateStr2);
  if (!d1 || !d2) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
}

/**
 * Section 15 MSMED Act 2006: Deterministic Payment Deadline Computation
 * 
 * Statutory Rule:
 * 1. If no written agreement: Buyer must pay within 15 calendar days from acceptance date.
 * 2. If written agreement exists: Buyer must pay within the agreed period, but this
 *    statutory window is strictly CAPPED AT 45 calendar days from acceptance date.
 *    (Any contractual term specifying >45 days is legally overridden by the 45-day cap).
 * 
 * @param {Object} params
 * @param {string} params.acceptance_date - ISO date string (YYYY-MM-DD)
 * @param {'no_agreement'|'written_agreement'} params.agreement_basis
 * @param {number|null} [params.agreement_days] - Contractual credit period in days
 * @returns {{ computed_deadline: string, applicable_window_days: number }}
 */
export function computeStatutoryDeadline({ acceptance_date, agreement_basis, agreement_days }) {
  if (!acceptance_date) {
    throw new Error("acceptance_date is required for deadline computation");
  }

  let applicable_window_days = 15;

  if (agreement_basis === 'written_agreement') {
    const agreed = Number(agreement_days);
    if (!isNaN(agreed) && agreed > 0) {
      // Contractual period capped strictly at statutory maximum of 45 days
      applicable_window_days = Math.min(agreed, 45);
    } else {
      applicable_window_days = 45;
    }
  } else {
    // Statutory default under Section 15 when no written agreement exists
    applicable_window_days = 15;
  }

  const computed_deadline = addDays(acceptance_date, applicable_window_days);

  return {
    computed_deadline,
    applicable_window_days
  };
}

/**
 * Determines compliance status of an invoice relative to deadline and payment date
 * 
 * Statuses:
 * - 'paid_on_time': payment_date exists and is <= computed_deadline
 * - 'paid_late': payment_date exists and is > computed_deadline
 * - 'breached': unpaid and today > computed_deadline
 * - 'at_risk': unpaid, today <= computed_deadline, and days_remaining <= alert_lead_time_days
 * - 'on_track': unpaid, today <= computed_deadline, and days_remaining > alert_lead_time_days
 * 
 * @param {Object} params
 * @param {string} params.computed_deadline - YYYY-MM-DD
 * @param {string|null} [params.payment_date] - YYYY-MM-DD (if paid)
 * @param {string} [params.as_of_date] - Evaluation date (defaults to today UTC)
 * @param {number} [params.alert_lead_time_days=5]
 * @returns {{ status: string, days_to_breach: number, is_breached: boolean }}
 */
export function evaluateComplianceStatus({
  computed_deadline,
  payment_date = null,
  as_of_date = formatDateUTC(new Date()),
  alert_lead_time_days = 5
}) {
  if (!computed_deadline) {
    return { status: 'on_track', days_to_breach: 999, is_breached: false };
  }

  if (payment_date) {
    const paidDiff = differenceInDays(computed_deadline, payment_date);
    if (paidDiff <= 0) {
      return { status: 'paid_on_time', days_to_breach: -paidDiff, is_breached: false };
    } else {
      return { status: 'paid_late', days_to_breach: -paidDiff, is_breached: true };
    }
  }

  // Unpaid: Evaluate against as_of_date
  // days_to_breach: positive means deadline is in the future, negative means overdue
  const days_to_breach = differenceInDays(as_of_date, computed_deadline);

  if (days_to_breach < 0) {
    return { status: 'breached', days_to_breach, is_breached: true };
  } else if (days_to_breach <= alert_lead_time_days) {
    return { status: 'at_risk', days_to_breach, is_breached: false };
  } else {
    return { status: 'on_track', days_to_breach, is_breached: false };
  }
}

/**
 * Section 16 MSMED Act 2006: Deterministic Compound Interest Calculation
 * 
 * Statutory Requirement:
 * "Where any buyer fails to make payment of the amount to the supplier, as required under
 * section 15, the buyer shall, notwithstanding anything contained in any agreement between
 * the buyer and the supplier or in any law for the time being in force, be liable to pay
 * compound interest with monthly rests to the supplier on that amount from the appointed
 * day or, as the case may be, from the date immediately following the date agreed upon,
 * at three times of the bank rate notified by the Reserve Bank."
 * 
 * Formula (Compound interest with monthly rests of 30 days):
 * - Rate per annum = 3 * rbi_bank_rate (e.g. 3 * 6.50% = 19.50% = 0.1950)
 * - Monthly interest rate i = Rate per annum / 12
 * - Overdue days = differenceInDays(computed_deadline, as_of_or_payment_date)
 * - Full months m = Math.floor(overdue_days / 30)
 * - Remaining fractional days rem = overdue_days % 30
 * - Compounded Principal after m months = P * (1 + i)^m
 * - Final Amount = Compounded Principal * (1 + (Rate per annum / 365) * rem)
 * - Interest Amount = Final Amount - P
 * 
 * @param {Object} params
 * @param {number} params.principal_amount - Principal invoice amount in INR
 * @param {string} params.computed_deadline - YYYY-MM-DD
 * @param {string|null} [params.payment_date] - YYYY-MM-DD (if paid late)
 * @param {string} [params.as_of_date] - YYYY-MM-DD (evaluation date if unpaid)
 * @param {number} [params.rbi_bank_rate=6.50] - Base RBI bank rate in percentage (e.g. 6.50)
 * @returns {{
 *   applicable_rate: number,
 *   days_overdue: number,
 *   interest_amount: number,
 *   total_amount_payable: number
 * }}
 */
export function calculateMSMEDInterest({
  principal_amount,
  computed_deadline,
  payment_date = null,
  as_of_date = formatDateUTC(new Date()),
  rbi_bank_rate = 6.50
}) {
  const principal = Number(principal_amount);
  if (isNaN(principal) || principal <= 0) {
    return {
      applicable_rate: Number((rbi_bank_rate * 3).toFixed(2)),
      days_overdue: 0,
      interest_amount: 0,
      total_amount_payable: 0
    };
  }

  const effectiveEnd = payment_date || as_of_date;
  const days_overdue = Math.max(0, differenceInDays(computed_deadline, effectiveEnd));

  const baseRate = Number(rbi_bank_rate);
  const applicable_rate = Number((baseRate * 3).toFixed(2)); // 3x RBI bank rate

  if (days_overdue <= 0) {
    return {
      applicable_rate,
      days_overdue: 0,
      interest_amount: 0,
      total_amount_payable: principal
    };
  }

  const annualRateDecimal = applicable_rate / 100;
  const monthlyRate = annualRateDecimal / 12;

  // Monthly rests calculation (standard 30-day monthly intervals for commercial interest)
  const fullMonths = Math.floor(days_overdue / 30);
  const remainingDays = days_overdue % 30;

  // Compounding through full months
  const compoundedAfterMonths = principal * Math.pow(1 + monthlyRate, fullMonths);

  // Pro-rata simple interest on compounded balance for remaining days
  const dailyRate = annualRateDecimal / 365;
  const finalAmount = compoundedAfterMonths * (1 + (dailyRate * remainingDays));

  const interest_amount = Number((finalAmount - principal).toFixed(2));
  const total_amount_payable = Number((principal + interest_amount).toFixed(2));

  return {
    applicable_rate,
    days_overdue,
    interest_amount,
    total_amount_payable
  };
}

/**
 * Classifies an overdue or upcoming invoice into standardized compliance ageing buckets
 * @param {number} days_to_breach - Negative if overdue, positive if ahead
 * @returns {string} '0_to_7_days' | '8_to_15_days' | '16_to_30_days' | '31_to_45_days' | '45_plus_breached'
 */
export function getAgeingBucket(days_to_breach) {
  if (days_to_breach < 0) {
    const overdue = Math.abs(days_to_breach);
    if (overdue <= 15) return 'overdue_1_to_15';
    if (overdue <= 30) return 'overdue_16_to_30';
    if (overdue <= 45) return 'overdue_31_to_45';
    return 'overdue_45_plus';
  } else {
    if (days_to_breach <= 7) return 'due_0_to_7';
    if (days_to_breach <= 15) return 'due_8_to_15';
    if (days_to_breach <= 30) return 'due_16_to_30';
    return 'due_31_plus';
  }
}

/**
 * Checks if Section 43B(h) applies based on vendor category
 * Only 'micro' and 'small' enterprises are covered by Section 43B(h) disallowance.
 * 'medium', 'not_registered' are exempt from 43B(h).
 * 'unknown' is treated as covered until verified for conservative risk management.
 * 
 * @param {string} udyamCategory 
 * @returns {boolean}
 */
export function isSection43BhApplicable(udyamCategory) {
  const cat = (udyamCategory || '').toLowerCase();
  return cat === 'micro' || cat === 'small' || cat === 'unknown';
}
