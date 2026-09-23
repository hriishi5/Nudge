import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.jsx';
import DeadlineBadge from '../components/DeadlineBadge.jsx';
import UdyamBadge from '../components/UdyamBadge.jsx';
import RecordPaymentModal from '../components/RecordPaymentModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatINR, formatDate } from '../lib/formatters.js';
import {
  UploadCloud,
  Search,
  ExternalLink,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export default function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { addToast } = useToast();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await apiClient.get('/invoices', { params });
      setInvoices(res.data.data || []);
    } catch (err) {
      addToast({
        title: 'Query failed',
        message: err.message || 'Could not fetch invoices.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleRecordPayment = async (paymentDate) => {
    if (!selectedInvoiceForPayment) return;
    try {
      await apiClient.patch(`/invoices/${selectedInvoiceForPayment.id}`, {
        payment_date: paymentDate
      });
      addToast({
        title: 'Settlement recorded',
        message: `Settlement recorded for invoice ${selectedInvoiceForPayment.invoice_number}`,
        type: 'success'
      });
      fetchInvoices();
    } catch (err) {
      addToast({
        title: 'Recording error',
        message: err.message || 'Failed to record payment.',
        type: 'error'
      });
    }
  };

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
      fetchInvoices();
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

  const tabs = [
    { id: 'all', label: 'All invoices' },
    { id: 'at_risk', label: 'At risk' },
    { id: 'breached', label: 'Breached' },
    { id: 'on_track', label: 'On track' },
    { id: 'paid_on_time', label: 'Paid on time' },
    { id: 'paid_late', label: 'Paid late' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#263B5D]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            MSME invoice register
          </h1>
        </div>

        <Link
          to="/invoices/upload"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2B4E7D] text-white self-start sm:self-auto transition-colors"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload new invoice</span>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-[#141E34] p-3 rounded-lg border border-[#263B5D] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setSearchParams(tab.id === 'all' ? {} : { status: tab.id });
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[#1E3A5F] text-white border border-[#2B4E7D]'
                  : 'text-slate-300 hover:text-white hover:bg-[#0F1729]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-72">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice or PO number..."
              className="w-full pl-8 pr-3 py-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2B4E7D]"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded text-xs font-medium bg-[#0F1729] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Invoices Master Table */}
      <div className="bg-[#141E34] border border-[#263B5D] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F1729] text-slate-400 text-[11px] font-medium border-b border-[#263B5D]">
              <tr>
                <th className="py-2.5 px-3.5">Invoice</th>
                <th className="py-2.5 px-3.5">Vendor & classification</th>
                <th className="py-2.5 px-3.5">Acceptance date</th>
                <th className="py-2.5 px-3.5">Statutory basis</th>
                <th className="py-2.5 px-3.5">Statutory deadline</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Principal amount</th>
                <th className="py-2.5 px-3.5 text-right">Penal interest</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263B5D]/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <p>Loading compliance records...</p>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 rounded-full bg-[#15803D]/20 border border-[#15803D]/40 flex items-center justify-center mx-auto text-[#22C55E] mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-medium text-white">Compliance confirmation</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">No invoices found matching the current statutory filter.</p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const interest = inv.interest_calculations?.[0];
                  return (
                    <tr key={inv.id} className="hover:bg-[#1A2742] transition-colors">
                      <td className="py-3 px-3.5 font-mono text-white">
                        <Link to={`/invoices/${inv.id}`} className="hover:text-blue-400 flex items-center gap-1.5 underline underline-offset-2">
                          <span>{inv.invoice_number}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </Link>
                        {inv.po_number && (
                          <span className="block text-[10px] text-slate-400 font-sans">
                            PO: {inv.po_number}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="text-white font-medium">{inv.vendors?.name || 'Unknown vendor'}</div>
                        <div className="mt-1">
                          <UdyamBadge
                            category={inv.vendors?.udyam_category}
                            registrationNumber={inv.vendors?.udyam_registration_number}
                            compact
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-serif text-slate-300 tabular-nums">
                        {formatDate(inv.acceptance_date || inv.invoice_date)}
                      </td>

                      <td className="py-3 px-3.5 text-slate-300 text-xs">
                        {inv.agreement_basis === 'written_agreement' ? (
                          <span>Written contract ({Math.min(inv.agreement_days || 45, 45)}d cap)</span>
                        ) : (
                          <span className="text-slate-400">No agreement (15d)</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-serif text-slate-200 tabular-nums">
                        {formatDate(inv.computed_deadline)}
                      </td>

                      <td className="py-3 px-3.5">
                        <DeadlineBadge status={inv.status} daysToBreach={inv.days_to_breach} />
                        {inv.payment_date && (
                          <span className="block text-[10px] text-slate-400 font-serif mt-0.5 tabular-nums">
                            Paid: {formatDate(inv.payment_date)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-right font-serif text-white font-medium tabular-nums">
                        {formatINR(inv.amount)}
                      </td>

                      <td className="py-3 px-3.5 text-right font-serif tabular-nums">
                        {interest && Number(interest.interest_amount) > 0 ? (
                          <div>
                            <span className="font-semibold text-[#F59E0B]">
                              {formatINR(interest.interest_amount)}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-sans">
                              {interest.days_overdue}d @ {interest.applicable_rate}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {!['paid_on_time', 'paid_late'].includes(inv.status) ? (
                            <button
                              onClick={() => setSelectedInvoiceForPayment(inv)}
                              className="px-2.5 py-1 rounded text-xs font-medium bg-[#0F1729] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors whitespace-nowrap"
                            >
                              Record pay
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#22C55E] font-medium mr-1 whitespace-nowrap">Settled</span>
                          )}

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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
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
