import React, { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../lib/formatters.js';
import {
  History,
  Bot,
  Cpu,
  User,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1, total_items: 0 });
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLogMetadata, setSelectedLogMetadata] = useState(null);

  const { addToast } = useToast();

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (actionFilter) params.action = actionFilter;

      const res = await apiClient.get('/audit-log', { params });
      setLogs(res.data.data || []);
      setPagination(res.data.pagination || { total_pages: 1, total_items: 0 });
    } catch (err) {
      addToast({
        title: 'Error',
        message: err.message || 'Could not fetch audit trail.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, actionFilter]);

  const actionLabels = {
    extraction: { label: 'AI document extraction', color: 'bg-[#1E3A5F]/40 text-[#93C5FD] border border-[#263B5D]' },
    udyam_classification: { label: 'Udyam classification', color: 'bg-[#15803D]/20 text-[#86EFAC] border border-[#15803D]/50' },
    declaration_drafted: { label: 'Declaration drafted', color: 'bg-[#1E3A5F]/30 text-slate-200 border border-[#263B5D]' },
    declaration_sent: { label: 'Declaration dispatched', color: 'bg-[#1E3A5F]/50 text-white border border-[#263B5D]' },
    deadline_computed: { label: 'Statutory deadline computed', color: 'bg-[#1E3A5F]/40 text-[#93C5FD] border border-[#263B5D]' },
    interest_calculated: { label: 'MSMED interest computed', color: 'bg-[#B45309]/25 text-[#FCD34D] border border-[#B45309]/50' },
    alert_raised: { label: 'Compliance alert raised', color: 'bg-[#7F1D1D]/25 text-[#FCA5A5] border border-[#7F1D1D]/50' },
    nl_query: { label: 'Copilot query', color: 'bg-[#0F1729] text-slate-300 border border-[#263B5D]' },
    invoice_updated: { label: 'Invoice updated', color: 'bg-[#0F1729] text-slate-300 border border-[#263B5D]' },
    vendor_created: { label: 'Vendor created', color: 'bg-[#0F1729] text-slate-300 border border-[#263B5D]' },
    settings_updated: { label: 'Settings updated', color: 'bg-[#0F1729] text-slate-300 border border-[#263B5D]' }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-[#8BA2C4]" />
            Immutable compliance audit trail
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident record of all AI extractions, statutory computations, alerts, and user modifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded bg-[#141E34] border border-[#263B5D] text-xs text-slate-300 focus:outline-none focus:border-[#8BA2C4]"
          >
            <option value="">All action types</option>
            <option value="extraction">AI extraction</option>
            <option value="udyam_classification">Udyam classification</option>
            <option value="deadline_computed">Deadline computation</option>
            <option value="declaration_sent">Declaration sent</option>
            <option value="interest_calculated">Interest calculation</option>
            <option value="nl_query">Copilot query</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#141E34] rounded border border-[#263B5D] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0F1729] text-[11px] text-slate-400 border-b border-[#263B5D]">
              <tr>
                <th className="py-2.5 px-3 font-medium">Timestamp (IST)</th>
                <th className="py-2.5 px-3 font-medium">Actor</th>
                <th className="py-2.5 px-3 font-medium">Action event</th>
                <th className="py-2.5 px-3 font-medium">Target entity</th>
                <th className="py-2.5 px-3 font-medium text-right">Audit metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263B5D] font-normal">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-5 h-5 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-xs">Loading audit records...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Compliance confirmation: No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionMeta = actionLabels[log.action] || {
                    label: log.action.replace(/_/g, ' '),
                    color: 'bg-[#0F1729] text-slate-300 border border-[#263B5D]'
                  };
                  return (
                    <tr key={log.id} className="hover:bg-[#1E3A5F]/20 transition-colors">
                      <td className="py-2.5 px-3 font-serif tabular-nums text-slate-400 text-[11px]">
                        {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          {log.actor === 'ai' && <Bot className="w-3.5 h-3.5 text-[#8BA2C4]" />}
                          {log.actor === 'system' && <Cpu className="w-3.5 h-3.5 text-[#15803D]" />}
                          {log.actor !== 'ai' && log.actor !== 'system' && <User className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="capitalize text-xs font-normal">
                            {log.actor === 'ai' ? 'Gemini 3.8' : log.actor}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${actionMeta.color}`}>
                          {actionMeta.label}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-serif tabular-nums text-slate-400 text-[11px]">
                        {log.target_table ? `${log.target_table} #${(log.target_id || '').slice(0, 8)}` : 'System'}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedLogMetadata(log)}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-[#0F1729] hover:bg-[#1E3A5F] text-slate-300 border border-[#263B5D] transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-slate-400" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-4 py-3 border-t border-[#263B5D] flex items-center justify-between text-xs text-slate-400 bg-[#0F1729]/60">
          <span>
            Showing page {pagination.page} of {pagination.total_pages || 1} ({pagination.total_items} total recorded events)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded bg-[#141E34] border border-[#263B5D] hover:bg-[#1E3A5F] text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.total_pages || 1, p + 1))}
              disabled={page >= (pagination.total_pages || 1)}
              className="p-1 rounded bg-[#141E34] border border-[#263B5D] hover:bg-[#1E3A5F] text-slate-300 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metadata JSON Modal */}
      {selectedLogMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141E34] border border-[#263B5D] w-full max-w-lg rounded shadow-2xl overflow-hidden p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#263B5D]">
              <h3 className="text-sm font-semibold text-slate-100">
                Audit event payload: {selectedLogMetadata.action}
              </h3>
              <button onClick={() => setSelectedLogMetadata(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-xs text-slate-400">
                <span>Actor: </span><strong className="text-slate-200">{selectedLogMetadata.actor}</strong> •{' '}
                <span>Target: </span><strong className="text-slate-200">{selectedLogMetadata.target_table}</strong>
              </div>

              <pre className="p-3 rounded bg-[#0F1729] border border-[#263B5D] text-slate-300 text-xs font-mono overflow-x-auto max-h-72">
                {JSON.stringify(selectedLogMetadata.metadata, null, 2)}
              </pre>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedLogMetadata(null)}
                  className="px-4 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2A4D7D] text-white border border-[#263B5D]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
