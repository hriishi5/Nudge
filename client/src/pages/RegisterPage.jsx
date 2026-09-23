import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  ArrowRight,
  Building2,
  Mail,
  Lock,
  User,
  Clock,
  TrendingDown,
  FileCheck2
} from 'lucide-react';

export default function RegisterPage() {
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register({
        organization_name: orgName,
        email,
        password,
        full_name: fullName
      });
      addToast({
        title: 'Registration successful',
        message: `Workspace created for ${orgName}.`,
        type: 'success'
      });
      navigate('/dashboard');
    } catch (err) {
      addToast({
        title: 'Registration error',
        message: err.message || 'Could not register organization.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1729] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        
        {/* Left Column: Statutory Overview */}
        <div className="lg:col-span-6 space-y-5">
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
              Set up enterprise compliance workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Equip your finance controllers and statutory auditors with a dedicated Section 43B(h) compliance register, automated Section 16 penal interest computations, and Form 3CD Clause 22 audit disclosures.
            </p>
          </div>

          {/* Institutional Statutory Principles */}
          <div className="space-y-3 pt-2">
            <div className="p-3 rounded bg-[#141E34] border border-[#263B5D] flex items-start gap-3">
              <div className="p-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-slate-300 shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Section 15 statutory deadline enforcement</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  15-day statutory window if no written contract; contractual credit strictly capped at 45 calendar days.
                </p>
              </div>
            </div>

            <div className="p-3 rounded bg-[#141E34] border border-[#263B5D] flex items-start gap-3">
              <div className="p-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-[#F59E0B] shrink-0 mt-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Section 16 compound penal interest math</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Three times (3x) notified RBI bank rate compounded with monthly rests. Non-deductible under Section 23.
                </p>
              </div>
            </div>

            <div className="p-3 rounded bg-[#141E34] border border-[#263B5D] flex items-start gap-3">
              <div className="p-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-[#22C55E] shrink-0 mt-0.5">
                <FileCheck2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Form 3CD Clause 22 tax audit disclosures</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Instant auditor-ready reporting on principal amounts unpaid, interest due, and year-end statutory disallowances.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="lg:col-span-6">
          <div className="rounded-lg bg-[#141E34] border border-[#263B5D] p-6 sm:p-7 shadow-xl">
            <div className="mb-5 pb-3 border-b border-[#263B5D]">
              <h2 className="text-base font-semibold text-white">Register organization</h2>
              <p className="text-xs text-slate-400 mt-0.5">Immediate workspace activation with admin privileges</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Legal entity name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Bharat Tech Solutions Pvt Ltd"
                    className="w-full pl-9 pr-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2B4E7D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Administrator name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. CA Rajesh Sharma"
                    className="w-full pl-9 pr-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2B4E7D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Official work email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="finance@bharattech.in"
                    className="w-full pl-9 pr-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2B4E7D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password (minimum 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2B4E7D]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#284C7A] text-white transition-colors disabled:opacity-50 mt-1"
              >
                <span>{submitting ? 'Creating workspace...' : 'Register organization workspace'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-slate-400">
              Already registered?{' '}
              <Link to="/login" className="text-slate-200 hover:underline">
                Sign in to existing account →
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
