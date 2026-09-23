import React, { useState } from 'react';
import { Send, Edit3, Sparkles, CheckCircle2 } from 'lucide-react';

export default function DeclarationDraftPreview({
  vendor,
  draft,
  onApproveAndSend,
  onRegenerate
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState(draft?.subject || `Urgent: Request for Udyam MSME Registration Certificate — ${vendor?.name}`);
  const [body, setBody] = useState(draft?.body || '');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await onApproveAndSend({
        declaration_id: draft?.id,
        subject,
        body,
        recipient_email: vendor?.email
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#141E34] p-5 rounded border border-[#263B5D]">
      <div className="flex items-center justify-between pb-3 border-b border-[#263B5D]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#0F1729] border border-[#263B5D] text-[#8BA2C4]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-100">AI-drafted Udyam declaration request</h4>
            <p className="text-[11px] text-slate-400">
              Statutory verification notice: Review before dispatching to {vendor?.name} ({vendor?.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-[#0F1729] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>{isEditing ? 'Done editing' : 'Edit notice'}</span>
          </button>
        </div>
      </div>

      <div className="mt-3.5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Email subject
          </label>
          {isEditing ? (
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-slate-100 focus:outline-none focus:border-[#8BA2C4]"
            />
          ) : (
            <div className="px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs font-normal text-slate-200">
              {subject}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Email message body
          </label>
          {isEditing ? (
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-slate-100 focus:outline-none focus:border-[#8BA2C4] leading-relaxed font-mono"
            />
          ) : (
            <div className="p-3.5 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {body}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#263B5D]">
          <span className="text-[11px] text-slate-400">
            Recipient: <strong className="text-slate-200 font-medium">{vendor?.email}</strong>
          </span>

          <div className="flex items-center gap-2.5">
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="px-3 py-1.5 rounded text-xs font-medium text-slate-300 hover:text-white bg-[#0F1729] border border-[#263B5D] hover:bg-[#1E3A5F] transition-colors"
              >
                Regenerate AI draft
              </button>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2A4D7D] text-white border border-[#263B5D] transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Dispatching...' : 'Approve & send notice'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
