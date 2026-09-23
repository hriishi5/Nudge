import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.jsx';
import { computeStatutoryDeadline, formatDateUTC, addDays } from '../services/compliance.service.js';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Loader2
} from 'lucide-react';

export default function InvoiceUploadPage() {
  const [file, setFile] = useState(null);
  const [documentText, setDocumentText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState(null);
  const [autoDetectedVendorName, setAutoDetectedVendorName] = useState('');

  // Form Fields
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [acceptanceDate, setAcceptanceDate] = useState(formatDateUTC(new Date()));
  const [agreementBasis, setAgreementBasis] = useState('no_agreement');
  const [agreementDays, setAgreementDays] = useState(30);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/vendors')
      .then(res => setVendors(res.data.data || []))
      .catch(() => {});
  }, []);

  let deadlinePreview = null;
  try {
    deadlinePreview = computeStatutoryDeadline({
      acceptance_date: acceptanceDate,
      agreement_basis: agreementBasis,
      agreement_days: agreementDays
    });
  } catch (e) {
    deadlinePreview = { computed_deadline: addDays(acceptanceDate, 15), applicable_window_days: 15 };
  }

  const runPreviewExtraction = async (selectedFile, text) => {
    if (!selectedFile && !text) return;
    setExtracting(true);
    try {
      const formData = new FormData();
      if (selectedFile) formData.append('file', selectedFile);
      if (text) formData.append('document_text', text);

      const res = await apiClient.post('/invoices/extract-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { extracted, matched_vendor, suggested_vendor_name } = res.data;
      setExtractedPreview(extracted);

      if (suggested_vendor_name) {
        setAutoDetectedVendorName(suggested_vendor_name);
        if (matched_vendor) {
          setSelectedVendorId(matched_vendor.id);
        } else {
          // Leave selectedVendorId empty so the auto-detected option is selected by default
          setSelectedVendorId('');
        }
      }

      if (extracted?.acceptance_date) {
        setAcceptanceDate(extracted.acceptance_date);
      }

      if (extracted?.has_written_agreement) {
        setAgreementBasis('written_agreement');
        if (extracted.agreement_days) {
          setAgreementDays(extracted.agreement_days);
        }
      } else if (extracted?.agreement_days) {
        setAgreementBasis('written_agreement');
        setAgreementDays(extracted.agreement_days);
      }

      addToast({
        title: 'Document analyzed',
        message: suggested_vendor_name 
          ? `Auto-detected vendor: ${suggested_vendor_name}` 
          : 'Invoice fields extracted successfully.',
        type: 'success'
      });
    } catch (err) {
      console.warn('[PREVIEW_EXTRACTION_NOTICE]', err.message);
      // Non-blocking: user can still proceed with manual entry or submit directly
    } finally {
      setExtracting(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      runPreviewExtraction(droppedFile, documentText);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const chosenFile = e.target.files[0];
      setFile(chosenFile);
      runPreviewExtraction(chosenFile, documentText);
    }
  };

  const handleUploadAndExtract = async (e) => {
    e.preventDefault();
    if (!file && !documentText) {
      addToast({
        title: 'Input missing',
        message: 'Please select a document file or paste invoice text.',
        type: 'warning'
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      if (documentText) {
        formData.append('document_text', documentText);
      }
      if (selectedVendorId) {
        formData.append('vendor_id', selectedVendorId);
      }
      formData.append('acceptance_date', acceptanceDate);
      formData.append('agreement_basis', agreementBasis);
      if (agreementBasis === 'written_agreement') {
        formData.append('agreement_days', agreementDays);
      }

      const res = await apiClient.post('/invoices/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const inv = res.data.invoice;
      const vendorName = inv.vendors?.name || autoDetectedVendorName || 'Vendor';

      addToast({
        title: 'Invoice registered',
        message: `Invoice ${inv.invoice_number} linked to ${vendorName}. Deadline: ${res.data.statutory_compliance.computed_deadline}`,
        type: 'success'
      });

      navigate(`/invoices/${res.data.invoice.id}`);
    } catch (err) {
      addToast({
        title: 'Processing error',
        message: err.message || 'Failed to process invoice.',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-2 border-b border-[#263B5D]">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>Upload vendor invoice</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Server-side extraction of vendor details, amount, acceptance date, and contractual credit terms. Statutory deadlines are calculated deterministically.
        </p>
      </div>

      <form onSubmit={handleUploadAndExtract} className="space-y-5">
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          className={`p-6 rounded-lg border border-dashed transition-colors text-center flex flex-col items-center justify-center cursor-pointer ${
            isDragOver 
              ? 'border-[#2B4E7D] bg-[#1E3A5F]/20' 
              : file 
              ? 'border-[#15803D]/60 bg-[#15803D]/10' 
              : 'border-[#263B5D] bg-[#141E34] hover:border-slate-500'
          }`}
          onClick={() => document.getElementById('file-upload-input').click()}
        >
          <input
            id="file-upload-input"
            type="file"
            accept=".pdf,.png,.jpeg,.jpg,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-10 h-10 rounded bg-[#0F1729] border border-[#263B5D] flex items-center justify-center mb-2.5">
            {file ? <CheckCircle2 className="w-5 h-5 text-[#22C55E]" /> : <UploadCloud className="w-5 h-5 text-slate-400" />}
          </div>

          {file ? (
            <div>
              <p className="text-xs font-semibold text-white">{file.name}</p>
              <p className="text-[11px] text-[#22C55E] mt-0.5">
                {(file.size / 1024).toFixed(1)} KB ready for extraction
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-white">
                Drag and drop vendor invoice PDF or scanned image
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports PDF, PNG, JPEG up to 10MB
              </p>
            </div>
          )}
        </div>

        {/* AI Extraction State Indicator & Extracted Preview Card */}
        {extracting && (
          <div className="p-3.5 rounded-lg bg-[#1E3A5F]/20 border border-[#2B4E7D] flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 text-[#38BDF8] animate-spin" />
              <span className="text-xs text-[#38BDF8] font-medium">
                AI model reading document & auto-detecting vendor, amounts, and dates...
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Gemini Flash Multimodal</span>
          </div>
        )}

        {extractedPreview && !extracting && (
          <div className="p-4 rounded-lg bg-[#0F1729] border border-[#15803D]/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#22C55E]" />
                <span className="text-xs font-semibold text-white">AI Document Extraction Summary</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#15803D]/20 text-[#22C55E] border border-[#15803D]/40">
                  {Math.round((extractedPreview.confidence || 0.95) * 100)}% confidence
                </span>
              </div>
              <button
                type="button"
                onClick={() => runPreviewExtraction(file, documentText)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Re-scan
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-[#141E34] p-2.5 rounded border border-[#263B5D]">
                <span className="text-[10px] text-slate-400 block">Detected Vendor</span>
                <span className="font-semibold text-[#22C55E] block mt-0.5 truncate" title={extractedPreview.vendor_name || 'Not detected'}>
                  {extractedPreview.vendor_name || '—'}
                </span>
              </div>
              <div className="bg-[#141E34] p-2.5 rounded border border-[#263B5D]">
                <span className="text-[10px] text-slate-400 block">Invoice Number</span>
                <span className="font-mono text-white block mt-0.5">
                  {extractedPreview.invoice_number || '—'}
                </span>
              </div>
              <div className="bg-[#141E34] p-2.5 rounded border border-[#263B5D]">
                <span className="text-[10px] text-slate-400 block">Total Amount</span>
                <span className="font-serif font-bold text-white block mt-0.5">
                  {extractedPreview.amount != null ? `₹ ${Number(extractedPreview.amount).toLocaleString('en-IN')}` : '—'}
                </span>
              </div>
              <div className="bg-[#141E34] p-2.5 rounded border border-[#263B5D]">
                <span className="text-[10px] text-slate-400 block">Acceptance Date</span>
                <span className="font-mono text-white block mt-0.5">
                  {extractedPreview.acceptance_date || '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Fallback Text Simulation Box */}
        <div className="bg-[#141E34] border border-[#263B5D] p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Or paste raw invoice text (OCR text simulation)</span>
            </label>
            {documentText.trim() && (
              <button
                type="button"
                onClick={() => runPreviewExtraction(null, documentText)}
                disabled={extracting}
                className="text-[11px] text-[#38BDF8] hover:text-white flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3" /> Auto-detect from text
              </button>
            )}
          </div>
          <textarea
            rows={3}
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="e.g. INVOICE # INV-2026-001 | Vendor: Precision Tooling Works | Date: 2026-04-01 | Total Amount: INR 2,50,000 | Terms: Net 30 Days"
            className="w-full px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2B4E7D] font-mono"
          />
        </div>

        {/* Statutory Parameters Section */}
        <div className="bg-[#141E34] border border-[#263B5D] p-5 rounded-lg space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Statutory parameters & agreement basis</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Vendor (Optional: Leave empty for AI auto-detection)
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D]"
              >
                <option value="">
                  {autoDetectedVendorName 
                    ? `✨ Auto-detected: ${autoDetectedVendorName} (Will auto-provision)` 
                    : 'Auto-detect vendor name from document'}
                </option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.udyam_category})
                  </option>
                ))}
              </select>
              {autoDetectedVendorName && !selectedVendorId && (
                <p className="text-[11px] text-[#22C55E] mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>Vendor <strong>{autoDetectedVendorName}</strong> will be auto-linked and registered.</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Day of acceptance (Delivery of goods / services)
              </label>
              <input
                type="date"
                value={acceptanceDate}
                onChange={(e) => setAcceptanceDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Statutory agreement basis (Section 15 MSMED Act)
              </label>
              <select
                value={agreementBasis}
                onChange={(e) => setAgreementBasis(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D]"
              >
                <option value="no_agreement">No written agreement (15-day statutory cap)</option>
                <option value="written_agreement">Written agreement (Agreed days, capped at 45)</option>
              </select>
            </div>

            {agreementBasis === 'written_agreement' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contractual credit days
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={agreementDays}
                  onChange={(e) => setAgreementDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D] font-mono"
                />
                {agreementDays > 45 && (
                  <p className="text-[11px] text-[#F59E0B] mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Contract specifies {agreementDays} days, but Section 15 strictly caps statutory deadline at 45 days.</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Live Computed Statutory Deadline Display */}
          <div className="p-3.5 rounded bg-[#0F1729] border border-[#263B5D] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">
                Deterministic statutory payment deadline
              </span>
              <span className="font-serif text-lg font-bold text-white tabular-nums">
                {deadlinePreview?.computed_deadline || '—'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-slate-300 px-2 py-0.5 rounded bg-[#141E34] border border-[#263B5D]">
                {deadlinePreview?.applicable_window_days} calendar days window
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2B4E7D] text-white transition-colors disabled:opacity-50"
          >
            {uploading ? 'Processing extraction...' : 'Process and register invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
