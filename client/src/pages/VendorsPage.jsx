import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.jsx';
import UdyamBadge from '../components/UdyamBadge.jsx';
import { formatINR } from '../lib/formatters.js';
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  ExternalLink,
  X,
  CheckCircle2
} from 'lucide-react';

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Vendor Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [udyamCategory, setUdyamCategory] = useState('unknown');
  const [udyamNumber, setUdyamNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { addToast } = useToast();

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await apiClient.get('/vendors', { params });
      setVendors(res.data.data || []);
    } catch (err) {
      addToast({
        title: 'Query failed',
        message: err.message || 'Could not fetch vendors.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [categoryFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVendors();
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/vendors', {
        name,
        email,
        udyam_category: udyamCategory,
        udyam_registration_number: udyamNumber || null
      });

      addToast({
        title: 'Vendor registered',
        message: `${name} added to vendor register.`,
        type: 'success'
      });

      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setUdyamCategory('unknown');
      setUdyamNumber('');
      fetchVendors();
    } catch (err) {
      addToast({
        title: 'Registration failed',
        message: err.message || 'Could not create vendor.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All vendors' },
    { id: 'micro', label: 'Micro enterprise' },
    { id: 'small', label: 'Small enterprise' },
    { id: 'medium', label: 'Medium enterprise' },
    { id: 'unknown', label: 'Pending verification' },
    { id: 'not_registered', label: 'Not registered' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#263B5D]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            MSME vendor master & Udyam register
          </h1>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2B4E7D] text-white transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add vendor</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-[#141E34] p-3 rounded-lg border border-[#263B5D] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                categoryFilter === tab.id
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
              placeholder="Search vendor, email, Udyam #..."
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

      {/* Vendor Table */}
      <div className="bg-[#141E34] border border-[#263B5D] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F1729] text-slate-400 text-[11px] font-medium border-b border-[#263B5D]">
              <tr>
                <th className="py-2.5 px-3.5">Vendor name</th>
                <th className="py-2.5 px-3.5">Contact email</th>
                <th className="py-2.5 px-3.5">Udyam classification</th>
                <th className="py-2.5 px-3.5">Certificate audit</th>
                <th className="py-2.5 px-3.5">Open payables</th>
                <th className="py-2.5 px-3.5 text-right">Total liability</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263B5D]/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <p>Loading vendor master...</p>
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 rounded-full bg-[#15803D]/20 border border-[#15803D]/40 flex items-center justify-center mx-auto text-[#22C55E] mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-medium text-white">Compliance confirmation</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">No vendors found matching current filter.</p>
                  </td>
                </tr>
              ) : (
                vendors.map(v => (
                  <tr key={v.id} className="hover:bg-[#1A2742] transition-colors">
                    <td className="py-3 px-3.5 font-medium text-white">
                      <Link to={`/vendors/${v.id}`} className="hover:text-blue-400 inline-flex items-center gap-1.5 underline underline-offset-2">
                        <span>{v.name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                      </Link>
                    </td>

                    <td className="py-3 px-3.5 text-slate-300 font-mono">
                      {v.email}
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <UdyamBadge
                        category={v.udyam_category}
                        registrationNumber={v.udyam_registration_number}
                      />
                    </td>

                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {v.udyam_certificate_path ? (
                        <span className="inline-flex items-center gap-1 text-[#22C55E] text-xs font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>On file</span>
                        </span>
                      ) : (
                        <span className="text-[#F59E0B] text-xs">Pending certificate</span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 font-serif tabular-nums whitespace-nowrap">
                      <span className="text-slate-200">{v.open_invoices_count || 0}</span>
                      {v.breached_invoices_count > 0 && (
                        <span className="text-[#EF4444] text-[10px] ml-1 font-sans">({v.breached_invoices_count} breached)</span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-right font-serif text-white font-medium tabular-nums whitespace-nowrap">
                      {formatINR(v.total_open_exposure || 0)}
                    </td>

                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <Link
                        to={`/vendors/${v.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#0F1729] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors whitespace-nowrap"
                      >
                        Profile & audit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="bg-[#141E34] border border-[#263B5D] w-full max-w-md rounded-lg overflow-hidden p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#263B5D]">
              <div>
                <h3 className="text-sm font-semibold text-white">Add vendor to master</h3>
                <p className="text-xs text-slate-400 mt-0.5">MSME classification and compliance tracking</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Legal enterprise name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Precision Components Pvt Ltd"
                  className="w-full px-3 py-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Accounts contact email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="accounts@vendor.com"
                  className="w-full px-3 py-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">MSME statutory category</label>
                <select
                  value={udyamCategory}
                  onChange={(e) => setUdyamCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D]"
                >
                  <option value="micro">Micro enterprise (Section 43B(h) active)</option>
                  <option value="small">Small enterprise (Section 43B(h) active)</option>
                  <option value="medium">Medium enterprise (Exempt from 43B(h))</option>
                  <option value="not_registered">Not registered under MSMED</option>
                  <option value="unknown">Pending verification / unverified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Udyam registration number (Optional)</label>
                <input
                  type="text"
                  value={udyamNumber}
                  onChange={(e) => setUdyamNumber(e.target.value)}
                  placeholder="e.g. UDYAM-MH-01-0012345"
                  className="w-full px-3 py-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D] font-mono uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#263B5D]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2B4E7D] text-white transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Save vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
