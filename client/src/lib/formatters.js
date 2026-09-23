/**
 * Formats a number into Indian Rupee currency format: ₹ 1,50,000.00
 * @param {number|string} amount 
 * @returns {string}
 */
export function formatINR(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
}

/**
 * Formats ISO YYYY-MM-DD to readable date like "16 Apr 2026"
 * @param {string} dateStr 
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Returns humanized relative days label
 * @param {number} daysToBreach 
 * @param {string} status 
 * @returns {string}
 */
export function formatDaysRemaining(daysToBreach, status) {
  if (status === 'paid_on_time') return 'Paid on time';
  if (status === 'paid_late') return 'Paid late';
  if (daysToBreach < 0) {
    const overdue = Math.abs(daysToBreach);
    return `${overdue} ${overdue === 1 ? 'day' : 'days'} overdue`;
  }
  if (daysToBreach === 0) return 'Due today';
  return `${daysToBreach} ${daysToBreach === 1 ? 'day' : 'days'} left`;
}
