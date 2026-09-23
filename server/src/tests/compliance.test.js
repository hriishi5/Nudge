import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStatutoryDeadline,
  calculateMSMEDInterest,
  evaluateComplianceStatus,
  isSection43BhApplicable,
  differenceInDays,
  addDays
} from '../services/compliance.service.js';

describe('Section 15 MSMED Act 2006: Deterministic Deadline Calculation', () => {
  // Test Case 1: No written agreement -> Statutory 15 days from acceptance date
  test('Case 1: No written agreement applies statutory 15 days window', () => {
    const result = computeStatutoryDeadline({
      acceptance_date: '2026-04-01',
      agreement_basis: 'no_agreement'
    });
    assert.equal(result.applicable_window_days, 15);
    assert.equal(result.computed_deadline, '2026-04-16');
  });

  // Test Case 2: Written agreement with 30 days (< 45 days cap) -> Honors 30 days
  test('Case 2: Written agreement with 30 days honors agreed period', () => {
    const result = computeStatutoryDeadline({
      acceptance_date: '2026-04-01',
      agreement_basis: 'written_agreement',
      agreement_days: 30
    });
    assert.equal(result.applicable_window_days, 30);
    assert.equal(result.computed_deadline, '2026-05-01');
  });

  // Test Case 3: Written agreement with exact 45 days -> Honors 45 days
  test('Case 3: Written agreement with exactly 45 days honors agreed period', () => {
    const result = computeStatutoryDeadline({
      acceptance_date: '2026-04-01',
      agreement_basis: 'written_agreement',
      agreement_days: 45
    });
    assert.equal(result.applicable_window_days, 45);
    // April has 30 days. 2026-04-01 + 45 days = 2026-05-16
    assert.equal(result.computed_deadline, '2026-05-16');
  });

  // Test Case 4: Written agreement specifying 60 days -> Strictly capped at 45 days statutory max
  test('Case 4: Written agreement exceeding 45 days (60 days) is capped at 45 days', () => {
    const result = computeStatutoryDeadline({
      acceptance_date: '2026-04-01',
      agreement_basis: 'written_agreement',
      agreement_days: 60
    });
    assert.equal(result.applicable_window_days, 45);
    assert.equal(result.computed_deadline, '2026-05-16');
  });

  // Test Case 5: Month boundary & leap/non-leap year edge case
  // 2026 is non-leap (Feb has 28 days). 2026-02-15 + 15 days = 2026-03-02
  test('Case 5: Month-end boundary across February in non-leap year', () => {
    const result = computeStatutoryDeadline({
      acceptance_date: '2026-02-15',
      agreement_basis: 'no_agreement'
    });
    assert.equal(result.applicable_window_days, 15);
    assert.equal(result.computed_deadline, '2026-03-02');
  });
});

describe('Section 16 MSMED Act 2006: Deterministic Compound Interest (3x RBI Rate with Monthly Rests)', () => {
  // Test Case 1: Principal ₹100,000, 30 days overdue (1 monthly rest), RBI bank rate 6.50% (applicable 19.50% p.a.)
  // Monthly rate = 19.50% / 12 = 1.625% = 0.01625
  // Compounded interest = 100,000 * 0.01625 = ₹1,625.00
  test('Case 1: Exactly 30 days overdue with 1 full monthly rest at 6.50% RBI rate', () => {
    const result = calculateMSMEDInterest({
      principal_amount: 100000,
      computed_deadline: '2026-04-01',
      as_of_date: '2026-05-01', // 30 days later
      rbi_bank_rate: 6.50
    });
    assert.equal(result.applicable_rate, 19.50);
    assert.equal(result.days_overdue, 30);
    assert.equal(result.interest_amount, 1625.00);
    assert.equal(result.total_amount_payable, 101625.00);
  });

  // Test Case 2: Principal ₹500,000, 60 days overdue (2 monthly rests), RBI bank rate 6.50% (applicable 19.50% p.a.)
  // Month 1: 500,000 * 1.01625 = 508,125.00
  // Month 2: 508,125 * 1.01625 = 516,382.03125 -> interest = ₹16,382.03
  test('Case 2: 60 days overdue with 2 full monthly rests (compounding effect)', () => {
    const result = calculateMSMEDInterest({
      principal_amount: 500000,
      computed_deadline: '2026-04-01',
      as_of_date: '2026-05-31', // 60 days later
      rbi_bank_rate: 6.50
    });
    assert.equal(result.applicable_rate, 19.50);
    assert.equal(result.days_overdue, 60);
    assert.equal(result.interest_amount, 16382.03);
    assert.equal(result.total_amount_payable, 516382.03);
  });

  // Test Case 3: Principal ₹200,000, 45 days overdue (1 month + 15 days pro-rata), RBI bank rate 6.75% (applicable 20.25% p.a.)
  // Monthly rate = 20.25% / 12 = 1.6875% = 0.016875
  // Month 1 balance: 200,000 * (1 + 0.016875) = 203,375.00
  // 15 days tail: 203,375 * (20.25% / 365 * 15) = 203,375 * 0.0083219178 = 1,692.47
  // Total balance: 203,375 + 1,692.47 = 205,067.47 -> interest = ₹5,067.47
  test('Case 3: 45 days overdue with 1 monthly rest + 15 prorated days at 6.75% RBI rate', () => {
    const result = calculateMSMEDInterest({
      principal_amount: 200000,
      computed_deadline: '2026-04-01',
      as_of_date: '2026-05-16', // 45 days later
      rbi_bank_rate: 6.75
    });
    assert.equal(result.applicable_rate, 20.25);
    assert.equal(result.days_overdue, 45);
    assert.equal(result.interest_amount, 5067.47);
    assert.equal(result.total_amount_payable, 205067.47);
  });

  // Zero overdue days produces zero interest
  test('Case 4: Not overdue produces zero interest', () => {
    const result = calculateMSMEDInterest({
      principal_amount: 100000,
      computed_deadline: '2026-04-16',
      as_of_date: '2026-04-10',
      rbi_bank_rate: 6.50
    });
    assert.equal(result.days_overdue, 0);
    assert.equal(result.interest_amount, 0);
    assert.equal(result.total_amount_payable, 100000);
  });
});

describe('Compliance Status Evaluation & 43B(h) Applicability', () => {
  test('Correctly identifies paid_on_time vs paid_late', () => {
    const onTime = evaluateComplianceStatus({
      computed_deadline: '2026-04-16',
      payment_date: '2026-04-15'
    });
    assert.equal(onTime.status, 'paid_on_time');
    assert.equal(onTime.is_breached, false);

    const paidLate = evaluateComplianceStatus({
      computed_deadline: '2026-04-16',
      payment_date: '2026-04-17'
    });
    assert.equal(paidLate.status, 'paid_late');
    assert.equal(paidLate.is_breached, true);
  });

  test('Correctly identifies breached, at_risk, and on_track for unpaid invoices', () => {
    // Overdue
    const breached = evaluateComplianceStatus({
      computed_deadline: '2026-04-16',
      as_of_date: '2026-04-18'
    });
    assert.equal(breached.status, 'breached');
    assert.equal(breached.is_breached, true);

    // Within alert lead time (e.g. 5 days remaining, lead time 5 days)
    const atRisk = evaluateComplianceStatus({
      computed_deadline: '2026-04-16',
      as_of_date: '2026-04-12',
      alert_lead_time_days: 5
    });
    assert.equal(atRisk.status, 'at_risk');
    assert.equal(atRisk.days_to_breach, 4);
    assert.equal(atRisk.is_breached, false);

    // Well ahead of deadline
    const onTrack = evaluateComplianceStatus({
      computed_deadline: '2026-04-16',
      as_of_date: '2026-04-01',
      alert_lead_time_days: 5
    });
    assert.equal(onTrack.status, 'on_track');
    assert.equal(onTrack.days_to_breach, 15);
    assert.equal(onTrack.is_breached, false);
  });

  test('Section 43B(h) applicability rules', () => {
    assert.equal(isSection43BhApplicable('micro'), true);
    assert.equal(isSection43BhApplicable('small'), true);
    assert.equal(isSection43BhApplicable('unknown'), true); // pending verification
    assert.equal(isSection43BhApplicable('medium'), false); // Medium is exempt from 43B(h)
    assert.equal(isSection43BhApplicable('not_registered'), false);
  });
});
