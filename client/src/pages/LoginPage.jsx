import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Building2,
  Clock,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { formatINR } from '../lib/formatters.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { login, demoLogin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      addToast({ title: 'Welcome back', message: 'Logged in successfully.', type: 'success' });
      navigate('/dashboard');
    } catch (err) {
      addToast({
        title: 'Authentication failed',
        message: err.message || 'Invalid email or password.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoAccess = () => {
    demoLogin('Bharat Heavy Dynamics Ltd');
    addToast({
      title: 'Demo workspace active',
      message: 'Logged in as administrator for Bharat Heavy Dynamics Ltd.',
      type: 'info'
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0F1729] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        
        {/* Left Column: Authentic Statutory Product Mockup */}
        <div className="lg:col-span-7 space-y-5">
          {/* Institutional Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#141E34] border border-[#263B5D] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 64 64" fill="none" className="w-6 h-6">
                <path d="M32 10 L48 17 C48 31 41 44 32 50 C23 44 16 31 16 17 Z" fill="#1E3A5F" />
                <path d="M26 36 V24 L38 36 V24" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="39" cy="23" r="3" fill="#15803D" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">Nudge</span>
                <span className="w-2 h-2 rounded-full bg-[#15803D]" title="Statutory register online"></span>
              </div>
              <p className="text-xs text-slate-400 font-medium">MSME compliance copilot</p>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
              Section 43B(h) statutory compliance register
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Institutional MSME vendor payables monitoring, deterministic 15/45-day countdowns, and Section 16 compound penal interest tracking for Indian finance teams and statutory auditors.
            </p>
          </div>

          {/* Actual Scaled-Down Real Component Mockup of Nudge Dashboard */}
          <div className="rounded-lg border border-[#263B5D] bg-[#141E34] overflow-hidden text-xs">
            {/* Mock Header Bar */}
            <div className="px-3.5 py-2 bg-[#0F1729] border-b border-[#263B5D] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
                <span className="font-medium text-slate-200">Statutory payables register</span>
                <span>•</span>
                <span className="font-mono text-[10px]">FY 2026-27</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Sec 15 & 16 MSMED Act</span>
            </div>

            {/* Inline Stat Strip Mockup */}
            <div className="grid grid-cols-3 divide-x divide-[#263B5D] border-b border-[#263B5D] bg-[#141E34]">
              <div className="p-3">
                <div className="text-[10px] text-slate-400">Section 43B(h) disallowance risk</div>
                <div className="font-serif text-base font-bold text-white tabular-nums mt-0.5">₹ 18,50,000.00</div>
                <div className="text-[10px] text-[#EF4444] mt-0.5">1 breached • 1 at risk</div>
              </div>
              <div className="p-3">
                <div className="text-[10px] text-slate-400">Sec 16 compound interest</div>
                <div className="font-serif text-base font-bold text-[#F59E0B] tabular-nums mt-0.5">₹ 42,850.00</div>
                <div className="text-[10px] text-slate-400 mt-0.5">3x RBI bank rate (19.5% p.a.)</div>
              </div>
              <div className="p-3">
                <div className="text-[10px] text-slate-400">Active MSME payables</div>
                <div className="font-serif text-base font-bold text-white tabular-nums mt-0.5">₹ 84,20,000.00</div>
                <div className="text-[10px] text-[#22C55E] mt-0.5">94% within statutory window</div>
              </div>
            </div>

            {/* Ageing Table Mockup */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#0F1729] text-slate-400 text-[10px] border-b border-[#263B5D]">
                  <tr>
                    <th className="py-2 px-3">Invoice</th>
                    <th className="py-2 px-3">Vendor / Category</th>
                    <th className="py-2 px-3">Deadline</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Principal</th>
                    <th className="py-2 px-3 text-right">Interest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263B5D]/60 font-sans">
                  <tr className="hover:bg-[#1A2742]/50">
                    <td className="py-2.5 px-3 font-mono text-white">INV-2026-088</td>
                    <td className="py-2.5 px-3">
                      <div className="text-white font-medium">Apex Precision Tooling</div>
                      <span className="inline-block text-[9px] px-1 rounded bg-[#15803D]/15 border border-[#15803D]/40 text-[#22C55E]">Micro</span>
                    </td>
                    <td className="py-2.5 px-3 font-serif text-slate-300 tabular-nums">17 Apr 2026</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-[#7F1D1D]/20 text-[#EF4444] border border-[#7F1D1D]/40">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>3 days overdue</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-serif text-white font-medium tabular-nums">₹ 18,50,000.00</td>
                    <td className="py-2.5 px-3 text-right font-serif text-[#F59E0B] tabular-nums">₹ 42,850.00</td>
                  </tr>

                  <tr className="hover:bg-[#1A2742]/50">
                    <td className="py-2.5 px-3 font-mono text-white">INV-2026-094</td>
                    <td className="py-2.5 px-3">
                      <div className="text-white font-medium">Kalyan Electro-Platers</div>
                      <span className="inline-block text-[9px] px-1 rounded bg-[#1E3A5F]/30 border border-[#1E3A5F]/60 text-[#93C5FD]">Small</span>
                    </td>
                    <td className="py-2.5 px-3 font-serif text-slate-300 tabular-nums">25 May 2026</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-[#B45309]/20 text-[#F59E0B] border border-[#B45309]/40">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>5 days left</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-serif text-white font-medium tabular-nums">₹ 12,40,000.00</td>
                    <td className="py-2.5 px-3 text-right font-serif text-slate-400 tabular-nums">—</td>
                  </tr>

                  <tr className="hover:bg-[#1A2742]/50">
                    <td className="py-2.5 px-3 font-mono text-white">INV-2026-102</td>
                    <td className="py-2.5 px-3">
                      <div className="text-white font-medium">Vardhman Packaging</div>
                      <span className="inline-block text-[9px] px-1 rounded bg-[#15803D]/15 border border-[#15803D]/40 text-[#22C55E]">Micro</span>
                    </td>
                    <td className="py-2.5 px-3 font-serif text-slate-300 tabular-nums">03 Jun 2026</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-[#15803D]/20 text-[#22C55E] border border-[#15803D]/40">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>14 days left</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-serif text-white font-medium tabular-nums">₹ 6,75,000.00</td>
                    <td className="py-2.5 px-3 text-right font-serif text-slate-400 tabular-nums">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="px-3.5 py-2 bg-[#0F1729] border-t border-[#263B5D] text-[10px] text-slate-400 flex items-center justify-between">
              <span>Section 15 statutory deadline prioritization</span>
              <span>Form 3CD Clause 22 audit ready</span>
            </div>
          </div>

          {/* Statutory Principles */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            <span>• 15-day statutory window (no agreement)</span>
            <span>• 45-day contractual limit</span>
            <span>• 3x RBI bank rate compound interest</span>
          </div>
        </div>

        {/* Right Column: Institutional Sign-in Form */}
        <div className="lg:col-span-5">
          <div className="rounded-lg bg-[#141E34] border border-[#263B5D] p-6 sm:p-7 shadow-xl">
            <div className="mb-5 pb-3 border-b border-[#263B5D]">
              <h2 className="text-base font-semibold text-white">Sign in to workspace</h2>
              <p className="text-xs text-slate-400 mt-0.5">Enter registered enterprise credentials</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Work email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="finance@yourcompany.com"
                    className="w-full pl-9 pr-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2B4E7D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-9 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2B4E7D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#284C7A] text-white transition-colors disabled:opacity-50 mt-1"
              >
                <span>{submitting ? 'Authenticating...' : 'Sign in to workspace'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Instant Demo Sandbox Option */}
            <div className="mt-5 pt-4 border-t border-[#263B5D]">
              <div className="text-[11px] text-slate-400 mb-2 font-medium">
                Instant demo access:
              </div>
              <button
                type="button"
                onClick={handleDemoAccess}
                className="w-full p-2.5 rounded bg-[#0F1729] hover:bg-[#1A2742] border border-[#263B5D] text-left flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-medium text-white">
                      Bharat Heavy Dynamics Ltd (Demo workspace)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Pre-seeded with active MSME payables & Section 16 interest
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <div className="mt-5 text-center text-xs text-slate-400">
              Need an organization workspace?{' '}
              <Link to="/register" className="text-slate-200 hover:underline">
                Register organization account →
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
