// ====================================================================
// Nudge Client: Deterministic Statutory Compliance Calculations
// Client-side helper for live UI previews (deadlines & interest)
// ====================================================================

export function parseDateUTC(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }
  const cleanStr = String(dateStr).trim().slice(0, 10);
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(Date.UTC(y, m - 1, d));
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function formatDateUTC(date) {
  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function addDays(dateStr, days) {
  const date = parseDateUTC(dateStr);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateUTC(date);
}

export function differenceInDays(dateStr1, dateStr2) {
  const d1 = parseDateUTC(dateStr1);
  const d2 = parseDateUTC(dateStr2);
  if (!d1 || !d2) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((d2.getTime() - d1.getTime()) / msPerDay);
}

export function computeStatutoryDeadline({ acceptance_date, agreement_basis, agreement_days }) {
  if (!acceptance_date) {
    return { computed_deadline: null, applicable_window_days: 15 };
  }

  let applicable_window_days = 15;

  if (agreement_basis === 'written_agreement') {
    const agreed = Number(agreement_days);
    if (!isNaN(agreed) && agreed > 0) {
      applicable_window_days = Math.min(agreed, 45);
    } else {
      applicable_window_days = 45;
    }
  } else {
    applicable_window_days = 15;
  }

  const computed_deadline = addDays(acceptance_date, applicable_window_days);

  return {
    computed_deadline,
    applicable_window_days
  };
}
