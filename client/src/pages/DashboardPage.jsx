import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.jsx';
import ExposureSummaryCard from '../components/ExposureSummaryCard.jsx';
import DeadlineBadge from '../components/DeadlineBadge.jsx';
import UdyamBadge from '../components/UdyamBadge.jsx';
import RecordPaymentModal from '../components/RecordPaymentModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatINR, formatDate } from '../lib/formatters.js';
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export default function DashboardPage() {
  const [invoices, setInvoices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { addToast } = useToast();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [invRes, alertRes] = await Promise.all([
        apiClient.get('/invoices'),
        apiClient.get('/alerts?acknowledged=false')
      ]);
      setInvoices(invRes.data.data || []);
      setAlerts(alertRes.data.data || []);
    } catch (err) {
      console.warn('Dashboard fetch notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/invoices/${invoiceToDelete.id}`);
      addToast({
        title: 'Invoice deleted',
        message: `Invoice ${invoiceToDelete.invoice_number} has been permanently deleted.`,
        type: 'success'
      });
      setInvoiceToDelete(null);
      fetchDashboardData();
    } catch (err) {
      addToast({
        title: 'Delete failed',
        message: err.message || 'Could not delete invoice.',
        type: 'error'
      });
    } finally {
      setDeleting(false);
    }
  };

  // Compute compliance metrics
  const openInvoices = invoices.filter(i => !['paid_on_time', 'paid_late'].includes(i.status));
  const breachedInvoices = openInvoices.filter(i => i.status === 'breached');
  const atRiskInvoices = openInvoices.filter(i => i.status === 'at_risk');
  const onTrackInvoices = openInvoices.filter(i => i.status === 'on_track');

  const totalExposure = openInvoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const breachedAmount = breachedInvoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const atRiskAmount = atRiskInvoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const disallowanceRisk = breachedAmount + atRiskAmount;

  const totalAccruedInterest = invoices.reduce((acc, i) => {
    const interest = i.interest_calculations?.[0]?.interest_amount || 0;
    return acc + Number(interest);
  }, 0);

  // Ageing breakdown counts
  const ageingBuckets = {
    '0_to_7_days': openInvoices.filter(i => (i.days_to_breach >= 0 && i.days_to_breach <= 7)).length,
    '8_to_15_days': openInvoices.filter(i => (i.days_to_breach > 7 && i.days_to_breach <= 15)).length,
    '16_to_30_days': openInvoices.filter(i => (i.days_to_breach > 15 && i.days_to_breach <= 30)).length,
    '31_plus_days': openInvoices.filter(i => (i.days_to_breach > 30)).length,
    'breached_overdue': breachedInvoices.length
  };

  const handleRecordPayment = async (paymentDate) => {
    if (!selectedInvoiceForPayment) return;
    try {
      await apiClient.patch(`/invoices/${selectedInvoiceForPayment.id}`, {
        payment_date: paymentDate
      });
      addToast({
        title: 'Settlement recorded',
        message: `Payment recorded for invoice ${selectedInvoiceForPayment.invoice_number}`,
        type: 'success'
      });
      fetchDashboardData();
    } catch (err) {
      addToast({
        title: 'Recording error',
        message: err.message || 'Failed to record payment.',
        type: 'error'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Institutional Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#263B5D]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            MSME statutory compliance register
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Section 43B(h) Income Tax Act & Section 15/16 MSMED statutory payment monitor
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/assistant"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#141E34] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            <span>AI assistant</span>
          </Link>
          <Link
            to="/invoices/upload"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2B4E7D] text-white transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload invoice</span>
          </Link>
        </div>
      </div>

      {/* 1. Compact Inline Statutory Stat Strip */}
      <ExposureSummaryCard
        totalExposure={totalExposure}
        disallowanceRisk={disallowanceRisk}
        accruedInterest={totalAccruedInterest}
        breachedCount={breachedInvoices.length}
        atRiskCount={atRiskInvoices.length}
        onTrackCount={onTrackInvoices.length}
      />

      {/* 2. Primary Working Surface: Statutory Payables Ageing Register */}
      <div className="bg-[#141E34] border border-[#263B5D] rounded-lg overflow-hidden">
        {/* Register Header & Ageing Counts Strip */}
        <div className="p-4 border-b border-[#263B5D] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Statutory payables ageing register
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous monitoring of Section 15 payment windows (15-day default, 45-day contractual limit)
            </p>
          </div>

          {/* Inline Ageing Summary Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded border border-[#7F1D1D]/40 bg-[#7F1D1D]/15 text-[#EF4444] font-medium">
              Breached: {ageingBuckets.breached_overdue}
            </span>
            <span className="px-2 py-0.5 rounded border border-[#B45309]/40 bg-[#B45309]/15 text-[#F59E0B] font-medium">
              0–7 days left: {ageingBuckets['0_to_7_days']}
            </span>
            <span className="px-2 py-0.5 rounded border border-[#263B5D] bg-[#0F1729] text-slate-300">
              8–15 days: {ageingBuckets['8_to_15_days']}
            </span>
            <span className="px-2 py-0.5 rounded border border-[#263B5D] bg-[#0F1729] text-slate-300">
              16–30 days: {ageingBuckets['16_to_30_days']}
            </span>
            <span className="px-2 py-0.5 rounded border border-[#15803D]/40 bg-[#15803D]/15 text-[#22C55E]">
              31+ days (45d cap): {ageingBuckets['31_plus_days']}
            </span>
          </div>
        </div>

        {/* High-Density Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F1729] text-slate-400 text-[11px] font-medium border-b border-[#263B5D]">
              <tr>
                <th className="py-2.5 px-3.5">Invoice</th>
                <th className="py-2.5 px-3.5">Vendor & classification</th>
                <th className="py-2.5 px-3.5">Acceptance date</th>
                <th className="py-2.5 px-3.5">Statutory deadline</th>
                <th className="py-2.5 px-3.5">Days to breach</th>
                <th className="py-2.5 px-3.5 text-right">Principal amount</th>
                <th className="py-2.5 px-3.5 text-right">Sec 16 interest</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263B5D]/60 font-sans">
              {openInvoices.map((inv) => {
                const interest = inv.interest_calculations?.[0]?.interest_amount || 0;
                return (
                  <tr key={inv.id} className="hover:bg-[#1A2742] transition-colors">
                    <td className="py-3 px-3.5 font-mono text-white">
                      <Link to={`/invoices/${inv.id}`} className="hover:text-blue-400 underline underline-offset-2">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="text-white font-medium">{inv.vendors?.name || 'Unknown vendor'}</div>
                      <div className="mt-1">
                        <UdyamBadge category={inv.vendors?.udyam_category} compact />
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-serif text-slate-300 tabular-nums">
                      {formatDate(inv.acceptance_date || inv.invoice_date)}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-serif text-slate-200 tabular-nums">{formatDate(inv.computed_deadline)}</div>
                      <div className="text-[10px] text-slate-400">
                        {inv.agreement_basis === 'written_agreement'
                          ? `Contract (${Math.min(inv.agreement_days || 45, 45)}d cap)`
                          : 'Statutory default (15d)'}
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <DeadlineBadge status={inv.status} daysToBreach={inv.days_to_breach} />
                    </td>
                    <td className="py-3 px-3.5 text-right font-serif text-white font-medium tabular-nums">
                      {formatINR(inv.amount)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-serif text-[#F59E0B] tabular-nums">
                      {Number(interest) > 0 ? formatINR(interest) : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedInvoiceForPayment(inv)}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-[#0F1729] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors"
                        >
                          Record pay
                        </button>
                        <button
                          onClick={() => setInvoiceToDelete(inv)}
                          className="p-1 rounded text-slate-400 hover:text-[#FCA5A5] hover:bg-[#7F1D1D]/20 border border-transparent hover:border-[#7F1D1D]/40 transition-colors"
                          title="Delete invoice uploaded by mistake"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Compliance Confirmation Empty State */}
              {openInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-9 h-9 rounded-full bg-[#15803D]/20 border border-[#15803D]/40 flex items-center justify-center mx-auto text-[#22C55E]">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-semibold text-white">
                        Compliance confirmation
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        No MSME payables are currently at risk. All supplier invoices are within statutory limits under Section 15 of the MSMED Act, 2006.
                      </p>
                      <div className="pt-2">
                        <Link
                          to="/invoices/upload"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2B4E7D] text-white"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Upload new MSME invoice</span>
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Actionable Statutory Alerts Register (Quiet Ledger) */}
      {alerts.length > 0 && (
        <div className="bg-[#141E34] border border-[#263B5D] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#263B5D]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              <h3 className="text-xs font-semibold text-white">
                Active compliance notifications ({alerts.length})
              </h3>
            </div>
            <Link to="/alerts" className="text-xs text-blue-400 hover:underline">
              View all alerts
            </Link>
          </div>

          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded border text-xs flex items-center justify-between ${
                  alert.severity === 'critical'
                    ? 'bg-[#7F1D1D]/15 border-[#7F1D1D]/40 text-[#EF4444]'
                    : alert.severity === 'warning'
                    ? 'bg-[#B45309]/15 border-[#B45309]/40 text-[#F59E0B]'
                    : 'bg-[#0F1729] border-[#263B5D] text-slate-300'
                }`}
              >
                <div>
                  <span className="font-semibold capitalize mr-2">[{alert.severity}]</span>
                  <span>{alert.message}</span>
                </div>
                <span className="text-[11px] font-serif text-slate-400 shrink-0 ml-4 tabular-nums">
                  {formatDate(alert.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      <RecordPaymentModal
        isOpen={Boolean(selectedInvoiceForPayment)}
        invoice={selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        onRecord={handleRecordPayment}
      />

      {/* Delete Invoice Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(invoiceToDelete)}
        title="Delete Invoice Record"
        message={invoiceToDelete ? `Are you sure you want to delete invoice "${invoiceToDelete.invoice_number}"? This will permanently remove its Section 15 statutory deadline computations, any associated compliance alerts, and Form 3CD schedules. This action is irreversible and recorded in the audit trail.` : ''}
        confirmLabel={deleting ? 'Deleting...' : 'Delete invoice'}
        cancelLabel="Keep invoice"
        isDestructive={true}
        loading={deleting}
        onConfirm={handleDeleteInvoice}
        onCancel={() => setInvoiceToDelete(null)}
      />
    </div>
  );
}
