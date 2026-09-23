import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../lib/formatters.js';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acknowledgedFilter, setAcknowledgedFilter] = useState('false');
  const [scanning, setScanning] = useState(false);

  const { addToast } = useToast();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/alerts?acknowledged=${acknowledgedFilter}`);
      setAlerts(res.data.data || []);
    } catch (err) {
      addToast({
        title: 'Error',
        message: err.message || 'Could not fetch alerts.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [acknowledgedFilter]);

  const handleAcknowledge = async (alertId) => {
    try {
      await apiClient.post(`/alerts/${alertId}/acknowledge`);
      addToast({
        title: 'Alert Acknowledged',
        message: 'Marked as reviewed.',
        type: 'success'
      });
      fetchAlerts();
    } catch (err) {
      addToast({
        title: 'Error',
        message: err.message || 'Failed to acknowledge alert.',
        type: 'error'
      });
    }
  };

  const handleScanNow = async () => {
    setScanning(true);
    try {
      const res = await apiClient.post('/jobs/scan-deadlines', {}, {
        headers: { 'X-Secret-Token': 'nudge_job_secret_token_67890' }
      });
      addToast({
        title: 'Scan Finished',
        message: `Scanned ${res.data.total_invoices_scanned} invoices. ${res.data.alerts_raised} alerts active.`,
        type: 'success'
      });
      fetchAlerts();
    } catch (e) {
      addToast({ title: 'Scan Notice', message: e.message, type: 'info' });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#8BA2C4]" />
            Statutory compliance alerts
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Section 15 deadline warnings and Section 43B(h) tax disallowance notifications
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleScanNow}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-[#141E34] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin text-[#8BA2C4]' : ''}`} />
            <span>Scan deadlines now</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#263B5D] pb-3">
        <button
          onClick={() => setAcknowledgedFilter('false')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            acknowledgedFilter === 'false'
              ? 'bg-[#1E3A5F] text-white border border-[#263B5D]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141E34]'
          }`}
        >
          Active unacknowledged
        </button>
        <button
          onClick={() => setAcknowledgedFilter('true')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            acknowledgedFilter === 'true'
              ? 'bg-[#1E3A5F] text-white border border-[#263B5D]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#141E34]'
          }`}
        >
          Acknowledged history
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block w-5 h-5 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-xs">Loading compliance alerts register...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-[#141E34] p-10 rounded border border-[#263B5D] text-center">
            <CheckCircle2 className="w-8 h-8 text-[#15803D] mx-auto mb-2.5" />
            <h3 className="text-sm font-semibold text-slate-100">
              Compliance confirmation: No active statutory alerts
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {acknowledgedFilter === 'false'
                ? 'All open MSME payables are currently within statutory credit periods under Section 15 of MSMED Act. No disallowance risk detected.'
                : 'No historical acknowledged alerts recorded.'}
            </p>
          </div>
        ) : (
          alerts.map(alert => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCritical
                    ? 'bg-[#7F1D1D]/15 border-[#7F1D1D]/50 text-slate-200'
                    : isWarning
                    ? 'bg-[#B45309]/15 border-[#B45309]/50 text-slate-200'
                    : 'bg-[#141E34] border-[#263B5D] text-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isCritical && <AlertCircle className="w-4 h-4 text-[#FCA5A5]" />}
                    {isWarning && <AlertTriangle className="w-4 h-4 text-[#FCD34D]" />}
                    {!isCritical && !isWarning && <Info className="w-4 h-4 text-[#8BA2C4]" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                        isCritical
                          ? 'bg-[#7F1D1D]/40 text-[#FCA5A5] border-[#7F1D1D]'
                          : isWarning
                          ? 'bg-[#B45309]/40 text-[#FCD34D] border-[#B45309]'
                          : 'bg-[#1E3A5F]/40 text-[#93C5FD] border-[#263B5D]'
                      }`}>
                        {isCritical ? 'Critical breach risk' : isWarning ? 'Deadline warning' : 'Statutory notice'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-serif tabular-nums">
                        {formatDate(alert.created_at)}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-100 font-normal">
                      {alert.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {alert.invoices && (
                    <Link
                      to={`/invoices/${alert.invoices.id}`}
                      className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium bg-[#141E34] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors"
                    >
                      <span>View invoice</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                  )}

                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2A4D7D] text-white border border-[#263B5D] transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
