import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.jsx';
import UdyamBadge from '../components/UdyamBadge.jsx';
import DeadlineBadge from '../components/DeadlineBadge.jsx';
import DeclarationDraftPreview from '../components/DeclarationDraftPreview.jsx';
import { formatINR, formatDate } from '../lib/formatters.js';
import {
  ArrowLeft,
  ShieldCheck,
  UploadCloud,
  FileText,
  Download,
  MessageSquare
} from 'lucide-react';

export default function VendorDetailPage() {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDraft, setActiveDraft] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchVendor = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/vendors/${id}`);
      const v = res.data.vendor;
      setVendor(v);

      const pendingDraft = (v.declaration_requests || []).find(r => r.direction === 'outbound_draft');
      if (pendingDraft) {
        setActiveDraft(pendingDraft);
      }
    } catch (err) {
      addToast({
        title: 'Error',
        message: err.message || 'Vendor not found.',
        type: 'error'
      });
      navigate('/vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendor();
  }, [id]);

  const handleTriggerDeclarationDraft = async () => {
    setDrafting(true);
    try {
      const res = await apiClient.post(`/vendors/${id}/request-declaration`);
      setActiveDraft(res.data.declaration);
      addToast({
        title: 'Draft generated',
        message: res.data.auto_sent 
          ? 'Declaration request auto-dispatched.' 
          : 'Draft ready for human approval.',
        type: 'success'
      });
      fetchVendor();
    } catch (err) {
      addToast({
        title: 'Draft error',
        message: err.message || 'Could not draft declaration.',
        type: 'error'
      });
    } finally {
      setDrafting(false);
    }
  };

  const handleApproveDeclaration = async ({ declaration_id, subject, body, recipient_email }) => {
    try {
      await apiClient.post(`/vendors/${id}/approve-declaration`, {
        declaration_id,
        subject,
        body,
        recipient_email
      });

      addToast({
        title: 'Declaration dispatched',
        message: `Email dispatched to ${recipient_email || vendor.email}`,
        type: 'success'
      });

      setActiveDraft(null);
      fetchVendor();
    } catch (err) {
      addToast({
        title: 'Send error',
        message: err.message || 'Failed to dispatch declaration request.',
        type: 'error'
      });
    }
  };

  const handleCertificateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCert(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post(`/vendors/${id}/upload-certificate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      addToast({
        title: 'Certificate verified',
        message: `Classified as ${res.data.classification.category} (${res.data.classification.udyam_registration_number || 'Number extracted'})`,
        type: 'success'
      });

      fetchVendor();
    } catch (err) {
      addToast({
        title: 'Upload error',
        message: err.message || 'Failed to classify certificate.',
        type: 'error'
      });
    } finally {
      setUploadingCert(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400">
        <p>Loading vendor profile...</p>
      </div>
    );
  }

  if (!vendor) return null;

  const invoices = vendor.invoices || [];
  const declarationThreads = vendor.declaration_requests || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#263B5D]">
        <div className="flex items-center gap-3">
          <Link
            to="/vendors"
            className="p-1.5 rounded bg-[#141E34] hover:bg-[#1E3A5F] text-slate-300 border border-[#263B5D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">{vendor.name}</h1>
              <UdyamBadge
                category={vendor.udyam_category}
                registrationNumber={vendor.udyam_registration_number}
              />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Contact: <span className="font-mono text-slate-300">{vendor.email}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerDeclarationDraft}
          disabled={drafting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2B4E7D] text-white transition-colors disabled:opacity-50"
        >
          <span>{drafting ? 'Drafting...' : 'Draft declaration request'}</span>
        </button>
      </div>

      {/* Udyam Certificate Management Card */}
      <div className="bg-[#141E34] border border-[#263B5D] p-5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded bg-[#0F1729] border border-[#263B5D] text-slate-300 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">Udyam registration certificate</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {vendor.udyam_certificate_path
                ? `Certificate verified on ${formatDate(vendor.udyam_verified_at || vendor.created_at)}`
                : 'No certificate on file. Upload official Udyam document to audit classification.'}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs text-slate-300 font-mono">
                {vendor.udyam_registration_number || 'Registration number missing'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {vendor.signed_certificate_url && (
            <a
              href={vendor.signed_certificate_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#0F1729] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>View document</span>
            </a>
          )}

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2B4E7D] text-white cursor-pointer transition-colors">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{uploadingCert ? 'Classifying...' : 'Upload certificate'}</span>
            <input
              type="file"
              accept=".pdf,.png,.jpeg,.jpg"
              onChange={handleCertificateUpload}
              disabled={uploadingCert}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* AI Declaration Request Draft Preview */}
      {activeDraft && (
        <DeclarationDraftPreview
          vendor={vendor}
          draft={activeDraft}
          onApproveAndSend={handleApproveDeclaration}
          onRegenerate={handleTriggerDeclarationDraft}
        />
      )}

      {/* Communication Thread Log */}
      <div className="bg-[#141E34] border border-[#263B5D] p-5 rounded-lg space-y-3">
        <h3 className="text-xs font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <span>Declaration requests & replies log ({declarationThreads.length})</span>
        </h3>

        <div className="space-y-2">
          {declarationThreads.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">
              No declaration requests dispatched to this vendor yet.
            </p>
          ) : (
            declarationThreads.map(req => (
              <div
                key={req.id}
                className="p-3 rounded bg-[#0F1729] border border-[#263B5D] space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#141E34] text-slate-300 border border-[#263B5D]">
                      {req.direction.replace(/_/g, ' ')}
                    </span>
                    <strong className="text-slate-200">{req.subject || 'MSME declaration request'}</strong>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDate(req.created_at)}
                  </span>
                </div>
                <p className="text-slate-400 whitespace-pre-wrap leading-relaxed line-clamp-3">
                  {req.body}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Associated Invoices for this vendor */}
      <div className="bg-[#141E34] border border-[#263B5D] rounded-lg overflow-hidden">
        <div className="p-3.5 border-b border-[#263B5D] bg-[#0F1729]">
          <h3 className="text-xs font-semibold text-white flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Invoices tracked for {vendor.name} ({invoices.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F1729] text-slate-400 text-[11px] font-medium border-b border-[#263B5D]">
              <tr>
                <th className="py-2.5 px-3.5">Invoice</th>
                <th className="py-2.5 px-3.5">Acceptance date</th>
                <th className="py-2.5 px-3.5">Statutory deadline</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Principal amount</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263B5D]/60 font-sans">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-[#1A2742] transition-colors">
                  <td className="py-2.5 px-3.5 font-mono text-white">
                    <Link to={`/invoices/${inv.id}`} className="hover:text-blue-400 underline underline-offset-2">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3.5 font-serif text-slate-300 tabular-nums">
                    {formatDate(inv.acceptance_date)}
                  </td>
                  <td className="py-2.5 px-3.5 font-serif text-slate-200 tabular-nums">
                    {formatDate(inv.computed_deadline)}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <DeadlineBadge status={inv.status} />
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-serif text-white font-medium tabular-nums">
                    {formatINR(inv.amount)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-[#0F1729] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors"
                    >
                      Audit
                    </Link>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No invoices recorded for this vendor yet.
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
