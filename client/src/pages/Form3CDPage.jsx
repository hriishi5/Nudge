import React, { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatINR, formatDate } from '../lib/formatters.js';
import {
  FileCheck2,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';

export default function Form3CDPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const { addToast } = useToast();

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/reports/form-3cd');
      setReport(res.data);
    } catch (err) {
      addToast({
        title: 'Report Error',
        message: err.message || 'Failed to generate Form 3CD summary.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReport();
    setRefreshing(false);
    addToast({
      title: 'Report Refreshed',
      message: 'Form 3CD Clause 22 disclosures synchronized with latest payables.',
      type: 'info'
    });
  };

  const handleDownloadCSV = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get(`/reports/form-3cd?format=csv&_t=${Date.now()}`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `form_3cd_clause_22_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast({
        title: 'Export Successful',
        message: 'Form 3CD Clause 22 audit schedule exported to CSV.',
        type: 'success'
      });
    } catch (err) {
      // Fallback: Generate directly from active table state
      if (lineItems && lineItems.length > 0) {
        try {
          let csv = 'Vendor Name,Udyam Number,Category,Invoice No,Acceptance Date,Statutory Days,Deadline,Payment Date,Principal (INR),Status,Days Overdue,MSMED Interest (INR),43B(h) Disallowance\n';
          for (const item of lineItems) {
            const accDate = item.acceptance_date ? String(item.acceptance_date).trim().slice(0, 10) : '—';
            const dline = item.computed_deadline ? String(item.computed_deadline).trim().slice(0, 10) : '—';
            const pdate = item.payment_date && item.payment_date !== 'Unpaid' 
              ? String(item.payment_date).trim().slice(0, 10) 
              : 'Unpaid';
            csv += `"${item.vendor_name}","${item.udyam_registration_number}","${item.udyam_category}","${item.invoice_number}","${accDate}",${item.statutory_window_days},"${dline}","${pdate}",${item.principal_amount},"${item.status}",${item.days_overdue},${item.accrued_msmed_interest},${item.section_43bh_disallowance_inr}\n`;
          }
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const dateStr = new Date().toISOString().split('T')[0];
          link.setAttribute('download', `form_3cd_clause_22_${dateStr}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          addToast({
            title: 'Export Successful',
            message: 'Form 3CD Clause 22 audit schedule exported to CSV.',
            type: 'success'
          });
          return;
        } catch (clientErr) {
          console.error(clientErr);
        }
      }
      addToast({
        title: 'Export Failed',
        message: err.response?.data?.message || err.message || 'Failed to download Form 3CD CSV.',
        type: 'error'
      });
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <div className="inline-block w-8 h-8 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">Compiling Form 3CD Clause 22 audit data...</p>
      </div>
    );
  }

  const disclosures = report?.clause_22_disclosures || {};
  const lineItems = report?.line_items || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in print:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[#8BA2C4]" />
            Tax audit Form 3CD — Clause 22 disclosures
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#141E34] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-[#141E34] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print schedule</span>
          </button>
          <button
            onClick={handleDownloadCSV}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2A4D7D] text-white border border-[#263B5D] transition-colors disabled:opacity-50"
          >
            <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Form 3CD Clause 22 Official Disclosure Paper (Warm Paper White) */}
      <div className="bg-[#F7F5F0] text-[#0F1729] p-6 sm:p-8 rounded border border-[#D5D0C7] shadow-sm space-y-6 print:border-none print:shadow-none">
        <div className="border-b border-[#D5D0C7] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div>
              <span className="text-[11px] font-semibold text-[#64748B]">Income Tax Act, 1961 • Section 44AB</span>
              <h3 className="text-base font-semibold text-[#0F1729] mt-0.5">
                Form 3CD — Clause 22 statutory disclosures
              </h3>
            </div>
            <div className="text-right text-xs text-[#64748B]">
              <span>Assessment year 2026-27 (FY {report?.financial_year || '2025-26'})</span>
              <span className="block text-[11px] font-serif tabular-nums">Compiled: {formatDate(report?.generated_at)}</span>
            </div>
          </div>
          <p className="text-xs text-[#475569] mt-2 leading-relaxed">
            Particulars of any interest due or paid under Section 16 of the Micro, Small and Medium Enterprises Development Act, 2006, along with deduction disallowance under Section 43B(h) of the Income Tax Act.
          </p>
        </div>

        {/* Clause 22 Itemized Lines */}
        <div className="space-y-2 text-xs">
          <div className="p-3 bg-white/70 rounded border border-[#E2DDD5] flex justify-between items-center gap-4">
            <span className="text-[#334155] leading-normal">
              <strong className="text-[#0F1729] font-medium">(a)</strong> Principal amount remaining unpaid to any supplier as at the end of the accounting year:
            </span>
            <span className="font-serif tabular-nums text-sm font-semibold text-[#0F1729] shrink-0">
              {formatINR(disclosures.item_a_principal_remaining_unpaid)}
            </span>
          </div>

          <div className="p-3 bg-white/70 rounded border border-[#E2DDD5] flex justify-between items-center gap-4">
            <span className="text-[#334155] leading-normal">
              <strong className="text-[#0F1729] font-medium">(b)</strong> Interest due thereon remaining unpaid to any supplier as at the end of the accounting year:
            </span>
            <span className="font-serif tabular-nums text-sm font-semibold text-[#B45309] shrink-0">
              {formatINR(disclosures.item_b_interest_due_thereon)}
            </span>
          </div>

          <div className="p-3 bg-white/70 rounded border border-[#E2DDD5] flex justify-between items-center gap-4">
            <span className="text-[#334155] leading-normal">
              <strong className="text-[#0F1729] font-medium">(c)</strong> Amount of interest paid in terms of Section 16, along with payment made beyond the appointed day:
            </span>
            <span className="font-serif tabular-nums text-sm font-semibold text-[#0F1729] shrink-0">
              {formatINR(disclosures.item_c_interest_paid_beyond_appointed_day)}
            </span>
          </div>

          <div className="p-3 bg-white/70 rounded border border-[#E2DDD5] flex justify-between items-center gap-4">
            <span className="text-[#334155] leading-normal">
              <strong className="text-[#0F1729] font-medium">(d)</strong> Amount of interest accrued and remaining unpaid at the end of the accounting year:
            </span>
            <span className="font-serif tabular-nums text-sm font-semibold text-[#B45309] shrink-0">
              {formatINR(disclosures.item_d_interest_accrued_and_remaining_unpaid)}
            </span>
          </div>

          <div className="p-3 bg-white/70 rounded border border-[#E2DDD5] flex justify-between items-center gap-4">
            <span className="text-[#334155] leading-normal">
              <strong className="text-[#0F1729] font-medium">(e)</strong> Amount of further interest remaining due and payable even in succeeding years:
            </span>
            <span className="font-serif tabular-nums text-sm font-semibold text-[#B45309] shrink-0">
              {formatINR(disclosures.item_e_further_interest_due_succeeding_years)}
            </span>
          </div>

          {/* Statutory Tax Impact Summary Box */}
          <div className="p-4 rounded border border-[#7F1D1D]/30 bg-[#7F1D1D]/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
            <div>
              <span className="text-xs font-semibold text-[#7F1D1D] block">
                Total Section 43B(h) taxable deduction disallowance
              </span>
              <span className="text-[11px] text-[#7F1D1D]/90">
                Sum of unpaid overdue invoices to Micro and Small enterprises added back to taxable business profits
              </span>
            </div>
            <span className="font-serif tabular-nums text-base font-bold text-[#7F1D1D] shrink-0">
              {formatINR(disclosures.total_section_43bh_disallowance_risk)}
            </span>
          </div>
        </div>
      </div>

      {/* Itemized MSME Schedule Table (Navy Ledger) */}
      <div className="bg-[#141E34] rounded border border-[#263B5D] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#263B5D] flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#8BA2C4]" />
            Itemized audit working paper — Micro & Small suppliers schedule
          </h3>
          <span className="text-[11px] text-slate-400 font-serif tabular-nums">
            {lineItems.length} records audited
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0F1729] text-[11px] text-slate-400 border-b border-[#263B5D]">
              <tr>
                <th className="py-2.5 px-3 font-medium">Supplier name</th>
                <th className="py-2.5 px-3 font-medium">Udyam number</th>
                <th className="py-2.5 px-3 font-medium">Category</th>
                <th className="py-2.5 px-3 font-medium">Invoice ref</th>
                <th className="py-2.5 px-3 font-medium">Acceptance</th>
                <th className="py-2.5 px-3 font-medium">Deadline</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium text-right">Principal (₹)</th>
                <th className="py-2.5 px-3 font-medium text-right">Penal interest (₹)</th>
                <th className="py-2.5 px-3 font-medium text-right">43B(h) disallowance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263B5D] font-normal">
              {lineItems.map(item => {
                const isBreached = item.status === 'breached';
                return (
                  <tr key={item.id} className="hover:bg-[#1E3A5F]/20 transition-colors">
                    <td className="py-2.5 px-3 text-slate-100 font-medium">{item.vendor_name}</td>
                    <td className="py-2.5 px-3 font-serif tabular-nums text-slate-400 text-[11px]">{item.udyam_registration_number}</td>
                    <td className="py-2.5 px-3 capitalize text-slate-300">{item.udyam_category}</td>
                    <td className="py-2.5 px-3 font-serif tabular-nums text-slate-200">{item.invoice_number}</td>
                    <td className="py-2.5 px-3 font-serif tabular-nums text-slate-400">{formatDate(item.acceptance_date)}</td>
                    <td className="py-2.5 px-3 font-serif tabular-nums text-slate-200">{formatDate(item.computed_deadline)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        isBreached
                          ? 'bg-[#7F1D1D]/20 text-[#FCA5A5] border-[#7F1D1D]'
                          : 'bg-[#15803D]/20 text-[#86EFAC] border-[#15803D]'
                      }`}>
                        {isBreached ? 'Breached' : 'Within limit'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-serif tabular-nums text-slate-100">{formatINR(item.principal_amount)}</td>
                    <td className="py-2.5 px-3 text-right font-serif tabular-nums text-[#FCD34D]">{formatINR(item.accrued_msmed_interest)}</td>
                    <td className="py-2.5 px-3 text-right font-serif tabular-nums font-semibold text-[#FCA5A5]">
                      {formatINR(item.section_43bh_disallowance_inr)}
                    </td>
                  </tr>
                );
              })}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Compliance confirmation: No Micro or Small enterprise invoices recorded for this financial year.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
