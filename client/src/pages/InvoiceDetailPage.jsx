import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.jsx';
import DeadlineBadge from '../components/DeadlineBadge.jsx';
import UdyamBadge from '../components/UdyamBadge.jsx';
import RecordPaymentModal from '../components/RecordPaymentModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatINR, formatDate } from '../lib/formatters.js';
import { calculateMSMEDInterest } from '../services/compliance.service.js';
import {
  ArrowLeft,
  ShieldCheck,
  TrendingDown,
  Download,
  Edit3,
  Save,
  CheckCircle2,
  Clock,
  Trash2
} from 'lucide-react';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit fields
  const [amount, setAmount] = useState('');
  const [acceptanceDate, setAcceptanceDate] = useState('');
  const [agreementBasis, setAgreementBasis] = useState('no_agreement');
  const [agreementDays, setAgreementDays] = useState(30);
  const [paymentDate, setPaymentDate] = useState('');
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/invoices/${id}`);
      const inv = res.data.invoice;
      setInvoice(inv);
      setAmount(inv.amount);
      setAcceptanceDate(inv.acceptance_date || '');
      setAgreementBasis(inv.agreement_basis || 'no_agreement');
      setAgreementDays(inv.agreement_days || 30);
      setPaymentDate(inv.payment_date || '');
    } catch (err) {
      addToast({
        title: 'Error',
        message: err.message || 'Invoice not found.',
        type: 'error'
      });
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleSaveCorrections = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        amount: Number(amount),
        acceptance_date: acceptanceDate,
        agreement_basis: agreementBasis,
        agreement_days: agreementBasis === 'written_agreement' ? Number(agreementDays) : null,
        payment_date: paymentDate || null
      };

      const res = await apiClient.patch(`/invoices/${id}`, payload);
      setInvoice(res.data.invoice);
      setIsEditing(false);
      addToast({
        title: 'Invoice updated',
        message: 'Statutory deadline and compliance status recomputed.',
        type: 'success'
      });
    } catch (err) {
      addToast({
        title: 'Update failed',
        message: err.message || 'Could not update invoice.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (selectedDate) => {
    try {
      await apiClient.patch(`/invoices/${id}`, {
        payment_date: selectedDate
      });
      addToast({
        title: 'Payment recorded',
        message: `Settlement recorded for invoice ${invoice.invoice_number}`,
        type: 'success'
      });
      fetchInvoice();
    } catch (err) {
      addToast({
        title: 'Recording error',
        message: err.message || 'Could not record payment.',
        type: 'error'
      });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/invoices/${id}`);
      addToast({
        title: 'Invoice deleted',
        message: `Invoice ${invoice.invoice_number} has been permanently deleted.`,
        type: 'success'
      });
      navigate('/invoices');
    } catch (err) {
      addToast({
        title: 'Delete failed',
        message: err.message || 'Could not delete invoice.',
        type: 'error'
      });
      setDeleting(false);
    }
  };

  if (loading || !invoice) {
    return (
      <div className="py-12 text-center text-slate-400">
        <p>Loading statutory compliance audit...</p>
      </div>
    );
  }

  const isBreached = invoice.live_status === 'breached';
  const isPaidLate = invoice.live_status === 'paid_late';

  // Compute live deterministic interest if missing or 0 for breached/late invoices
  let interest = invoice.interest_calculations?.[0];
  if ((isBreached || isPaidLate) && (!interest || Number(interest.interest_amount || 0) === 0) && invoice.computed_deadline) {
    const liveCalc = calculateMSMEDInterest({
      principal_amount: invoice.amount,
      computed_deadline: invoice.computed_deadline,
      payment_date: invoice.payment_date,
      rbi_bank_rate: interest?.rbi_bank_rate || 6.50
    });
    if (liveCalc.days_overdue > 0) {
      interest = liveCalc;
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#263B5D]">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="p-1.5 rounded bg-[#141E34] hover:bg-[#1E3A5F] text-slate-300 border border-[#263B5D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">
                {invoice.invoice_number}
              </h1>
              <DeadlineBadge status={invoice.live_status} daysToBreach={invoice.days_to_breach} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              PO: {invoice.po_number || 'None'} • Created {formatDate(invoice.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {invoice.signed_file_url && (
            <a
              href={invoice.signed_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#141E34] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download document</span>
            </a>
          )}

          {!invoice.payment_date && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2B4E7D] text-white transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record payment</span>
            </button>
          )}

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#141E34] hover:bg-[#1E3A5F] text-slate-300 border border-[#263B5D] transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel edit' : 'Edit fields'}</span>
          </button>

          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#141E34] hover:bg-[#7F1D1D]/30 text-[#FCA5A5] border border-[#7F1D1D]/40 transition-colors"
            title="Delete invoice uploaded by mistake"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete invoice</span>
          </button>
        </div>
      </div>

      {/* Top Compliance Stats Strip */}
      <div className="bg-[#141E34] border border-[#263B5D] rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#263B5D]">
          <div className="px-5 py-3">
            <div className="text-xs text-slate-400">Principal payable</div>
            <div className="font-serif text-xl font-bold text-white tabular-nums mt-0.5">
              {formatINR(invoice.amount)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{invoice.currency}</div>
          </div>

          <div className="px-5 py-3">
            <div className="text-xs text-slate-400">Statutory deadline</div>
            <div className="font-serif text-xl font-bold text-slate-200 tabular-nums mt-0.5">
              {formatDate(invoice.computed_deadline)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {invoice.agreement_basis === 'written_agreement'
                ? `Written contract (${Math.min(invoice.agreement_days || 45, 45)}d cap)`
                : 'No agreement (15d statutory window)'}
            </div>
          </div>

          <div className="px-5 py-3">
            <div className="text-xs text-slate-400">Section 43B(h) exposure</div>
            <div className={`font-serif text-xl font-bold tabular-nums mt-0.5 ${isBreached ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
              {isBreached ? formatINR(invoice.amount) : '₹ 0.00'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {isBreached ? 'Disallowable from tax deduction' : 'Eligible for tax deduction'}
            </div>
          </div>

          <div className="px-5 py-3">
            <div className="text-xs text-slate-400">MSMED penal interest</div>
            <div className={`font-serif text-xl font-bold tabular-nums mt-0.5 ${interest && Number(interest.interest_amount) > 0 ? 'text-[#F59E0B]' : 'text-slate-400'}`}>
              {formatINR(interest?.interest_amount || 0)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {interest ? `${interest.days_overdue} days @ ${interest.applicable_rate}% p.a.` : '3x RBI rate (monthly rests)'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Calculation Ledger & Vendor Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {isEditing ? (
            <form onSubmit={handleSaveCorrections} className="bg-[#141E34] border border-[#263B5D] p-5 rounded-lg space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-slate-400" />
                <span>Manual compliance correction</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Principal amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Day of acceptance</label>
                  <input
                    type="date"
                    value={acceptanceDate}
                    onChange={(e) => setAcceptanceDate(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Agreement basis</label>
                  <select
                    value={agreementBasis}
                    onChange={(e) => setAgreementBasis(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D]"
                  >
                    <option value="no_agreement">No written agreement (15 days)</option>
                    <option value="written_agreement">Written agreement (capped at 45 days)</option>
                  </select>
                </div>

                {agreementBasis === 'written_agreement' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contractual credit days</label>
                    <input
                      type="number"
                      value={agreementDays}
                      onChange={(e) => setAgreementDays(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D] font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Payment settlement date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D] font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#263B5D]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2B4E7D] text-white transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Recompute & save'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-[#141E34] border border-[#263B5D] p-5 rounded-lg space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Section 15 statutory timeline audit</span>
              </h3>

              <div className="relative pl-5 border-l border-[#263B5D] space-y-5">
                <div className="relative">
                  <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#1E3A5F] border-2 border-[#0F1729]"></div>
                  <h4 className="text-xs font-semibold text-white">Day of acceptance</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Goods delivered or services rendered on <strong className="text-slate-200">{formatDate(invoice.acceptance_date)}</strong>.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#1E3A5F] border-2 border-[#0F1729]"></div>
                  <h4 className="text-xs font-semibold text-white">
                    Statutory window: {invoice.agreement_basis === 'written_agreement' ? `${Math.min(invoice.agreement_days || 45, 45)} days (contractual cap)` : '15 days (no agreement)'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {invoice.agreement_basis === 'written_agreement'
                      ? `Contractual credit terms applied up to statutory cap of 45 days under Section 15 of MSMED Act, 2006.`
                      : `In absence of a written contract, statutory Section 15 default applies (15 calendar days).`}
                  </p>
                </div>

                <div className="relative">
                  <div className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-[#0F1729] ${isBreached ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`}></div>
                  <h4 className={`text-xs font-semibold ${isBreached ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                    Statutory deadline: {formatDate(invoice.computed_deadline)}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {invoice.payment_date ? (
                      <span>Settled on {formatDate(invoice.payment_date)} ({isPaidLate ? 'Late settlement' : 'On time'})</span>
                    ) : isBreached ? (
                      <span className="text-[#EF4444] font-medium">Overdue by {Math.abs(invoice.days_to_breach)} days. Non-deductible compound interest accruing.</span>
                    ) : (
                      <span>Payment due in {invoice.days_to_breach} days.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 16 Interest Calculation Breakdown */}
          {(isBreached || isPaidLate || (interest && Number(interest.interest_amount) > 0)) && (
            <div className="bg-[#141E34] border border-[#263B5D] p-5 rounded-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#263B5D]">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-[#F59E0B]" />
                  <h3 className="text-sm font-semibold text-white">Section 16 MSMED interest computation</h3>
                </div>
                <span className="font-serif font-bold text-sm text-[#F59E0B] tabular-nums">
                  Total: {formatINR(interest?.interest_amount || 0)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded bg-[#0F1729] border border-[#263B5D]">
                  <span className="text-slate-400 block text-[10px]">Base RBI bank rate</span>
                  <span className="font-serif text-white font-medium tabular-nums mt-0.5 block">{interest?.rbi_bank_rate || 6.50}%</span>
                </div>
                <div className="p-2.5 rounded bg-[#0F1729] border border-[#263B5D]">
                  <span className="text-slate-400 block text-[10px]">Applicable rate (3x)</span>
                  <span className="font-serif text-[#F59E0B] font-medium tabular-nums mt-0.5 block">{interest?.applicable_rate || 19.50}%</span>
                </div>
                <div className="p-2.5 rounded bg-[#0F1729] border border-[#263B5D]">
                  <span className="text-slate-400 block text-[10px]">Days overdue</span>
                  <span className="font-serif text-[#EF4444] font-medium tabular-nums mt-0.5 block">{interest?.days_overdue || 0} days</span>
                </div>
                <div className="p-2.5 rounded bg-[#0F1729] border border-[#263B5D]">
                  <span className="text-slate-400 block text-[10px]">Compounding rests</span>
                  <span className="text-slate-200 font-medium mt-0.5 block">Monthly</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed border-t border-[#263B5D] pt-2">
                Under Section 23 of the MSMED Act, 2006, this penal interest is strictly <strong>non-deductible</strong> as an expense for income tax computation.
              </p>
            </div>
          )}
        </div>

        {/* Right 1 Col: Vendor Details Card */}
        <div className="space-y-6">
          <div className="bg-[#141E34] border border-[#263B5D] p-5 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>Vendor classification</span>
            </h3>

            {invoice.vendors ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Vendor name</span>
                  <Link
                    to={`/vendors/${invoice.vendors.id}`}
                    className="text-sm font-medium text-white hover:text-blue-400 transition-colors"
                  >
                    {invoice.vendors.name}
                  </Link>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-1">Udyam registration</span>
                  <UdyamBadge
                    category={invoice.vendors.udyam_category}
                    registrationNumber={invoice.vendors.udyam_registration_number}
                  />
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Official email</span>
                  <span className="text-slate-300 font-mono">{invoice.vendors.email}</span>
                </div>

                <div className="pt-2 border-t border-[#263B5D]">
                  <Link
                    to={`/vendors/${invoice.vendors.id}`}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    View vendor compliance profile →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No vendor linked.</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Recording Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        invoice={invoice}
        onClose={() => setIsPaymentModalOpen(false)}
        onRecord={handleRecordPayment}
      />

      {/* Delete Invoice Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Invoice Record"
        message={`Are you sure you want to delete invoice "${invoice.invoice_number}"? This will permanently remove its Section 15 deadline calculations, any associated compliance alerts, and Form 3CD schedules. This action is irreversible and recorded in the audit trail.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete invoice'}
        cancelLabel="Keep invoice"
        isDestructive={true}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
