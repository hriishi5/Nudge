import React, { useState, useEffect } from 'react';
import apiClient from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Settings,
  Save,
  ShieldCheck,
  AlertTriangle,
  Percent,
  Clock,
  Send,
  Building2
} from 'lucide-react';

export default function SettingsPage() {
  const [leadTimeDays, setLeadTimeDays] = useState(5);
  const [rbiBankRate, setRbiBankRate] = useState(6.50);
  const [defaultAgreement, setDefaultAgreement] = useState('no_agreement');
  const [autoSendDeclarations, setAutoSendDeclarations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const { org } = useAuth();
  const { addToast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/settings');
      const s = res.data.settings;
      if (s) {
        setLeadTimeDays(s.alert_lead_time_days ?? 5);
        setRbiBankRate(s.rbi_bank_rate ?? 6.50);
        setDefaultAgreement(s.default_agreement_basis ?? 'no_agreement');
        setAutoSendDeclarations(Boolean(s.auto_send_declarations));
      }
    } catch (err) {
      console.warn('Could not load settings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch('/settings', {
        alert_lead_time_days: Number(leadTimeDays),
        rbi_bank_rate: Number(rbiBankRate),
        default_agreement_basis: defaultAgreement,
        auto_send_declarations: autoSendDeclarations
      });
      addToast({
        title: 'Settings Saved',
        message: 'Organization compliance configuration updated.',
        type: 'success'
      });
    } catch (err) {
      addToast({
        title: 'Save Failed',
        message: err.message || 'Could not update settings.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <div className="inline-block w-6 h-6 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-xs">Loading organization settings...</p>
      </div>
    );
  }

  const applicableRate = (Number(rbiBankRate) * 3).toFixed(2);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#8BA2C4]" />
          Statutory compliance settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure RBI bank rate, alert lead times, and Udyam declaration policies for {org?.name || 'your organization'}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Card 1: RBI Rate & Interest Configuration */}
        <div className="bg-[#141E34] p-5 rounded border border-[#263B5D] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#263B5D]">
            <Percent className="w-4 h-4 text-[#8BA2C4]" />
            <h3 className="text-xs font-semibold text-slate-100">
              RBI bank rate & Section 16 penal interest rate
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Current RBI notified bank rate (%)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="20"
                value={rbiBankRate}
                onChange={(e) => setRbiBankRate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-slate-100 focus:outline-none focus:border-[#8BA2C4] font-serif tabular-nums"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Periodically revised by Reserve Bank of India Monetary Policy Committee.
              </p>
            </div>

            <div className="p-3.5 rounded bg-[#0F1729] border border-[#263B5D] flex flex-col justify-center">
              <span className="text-[11px] font-medium text-slate-400">
                Statutory MSMED interest rate (3x bank rate)
              </span>
              <span className="text-xl font-serif tabular-nums font-semibold text-[#FCD34D] mt-1">
                {applicableRate}% p.a.
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Section 16: Compound interest with monthly rests
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Deadline & Alerts Policy */}
        <div className="bg-[#141E34] p-5 rounded border border-[#263B5D] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#263B5D]">
            <Clock className="w-4 h-4 text-[#8BA2C4]" />
            <h3 className="text-xs font-semibold text-slate-100">
              Alert lead time & statutory agreement assumption
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Alert lead time (days before deadline)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                required
                className="w-full px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-slate-100 focus:outline-none focus:border-[#8BA2C4] font-serif tabular-nums"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Triggers internal statutory alerts before Section 15 payment deadline is breached.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Default agreement assumption for invoices
              </label>
              <select
                value={defaultAgreement}
                onChange={(e) => setDefaultAgreement(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-slate-100 focus:outline-none focus:border-[#8BA2C4]"
              >
                <option value="no_agreement">Assume no agreement (15-day statutory cap)</option>
                <option value="written_agreement">Assume written agreement (45-day statutory cap)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Conservative compliance posture defaults to 15 days unless a written agreement is uploaded.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: AI & Communication Policies */}
        <div className="bg-[#141E34] p-5 rounded border border-[#263B5D] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#263B5D]">
            <Send className="w-4 h-4 text-[#8BA2C4]" />
            <h3 className="text-xs font-semibold text-slate-100">
              Outbound vendor communications
            </h3>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded bg-[#0F1729] border border-[#263B5D]">
            <div>
              <span className="text-xs font-medium text-slate-200 block">
                Auto-send Udyam declaration requests
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                When disabled, AI-drafted declaration requests require manual finance officer review before dispatch.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSendDeclarations}
                onChange={(e) => setAutoSendDeclarations(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E3A5F]"></div>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2A4D7D] text-white border border-[#263B5D] transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving settings...' : 'Save configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
