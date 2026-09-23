import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../lib/apiClient.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  ExternalLink,
  HelpCircle,
  Clock
} from 'lucide-react';

export default function AssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your Section 43B(h) MSME compliance copilot. I operate strictly on your organization\'s live invoice and vendor data to help you identify deadline risks, disallowance exposure, and Udyam certification gaps.\n\nHow can I assist your finance team today?',
      supporting_invoice_ids: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();

  const suggestedQueries = [
    'Which vendors are at risk of breaching this week?',
    'What is our total Section 43B(h) tax disallowance exposure?',
    'List all breached invoices and accrued penal interest',
    'Which vendors are missing Udyam registration certificates?'
  ];

  const handleSend = async (questionText) => {
    const q = questionText || query;
    if (!q.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await apiClient.post('/assistant/query', { query: q.trim() });
      const assistantMessage = {
        role: 'assistant',
        content: res.data.answer,
        supporting_invoice_ids: res.data.supporting_invoice_ids || [],
        confidence: res.data.confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      addToast({
        title: 'Assistant Error',
        message: err.message || 'Could not query assistant.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in flex flex-col h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8BA2C4]" />
            Compliance Copilot
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Natural-language statutory inquiry scoped strictly to your organization's compliance records
          </p>
        </div>
      </div>

      {/* Suggested Queries Pills */}
      <div className="shrink-0 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 whitespace-nowrap font-medium flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          Suggested:
        </span>
        {suggestedQueries.map((sq, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(sq)}
            className="px-2.5 py-1 rounded text-xs font-medium bg-[#141E34] hover:bg-[#1E3A5F] text-slate-300 border border-[#263B5D] transition-colors whitespace-nowrap"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 bg-[#141E34] p-5 rounded border border-[#263B5D] overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded flex items-center justify-center shrink-0 text-xs ${
                msg.role === 'user'
                  ? 'bg-[#1E3A5F] text-white border border-[#263B5D]'
                  : 'bg-[#0F1729] text-[#8BA2C4] border border-[#263B5D]'
              }`}
            >
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-2xl rounded p-3.5 text-xs leading-relaxed border ${
                msg.role === 'user'
                  ? 'bg-[#1E3A5F] border-[#263B5D] text-white'
                  : 'bg-[#0F1729] border-[#263B5D] text-slate-200'
              }`}
            >
              <div className="whitespace-pre-wrap font-normal">{msg.content}</div>

              {/* Supporting Invoices Chips */}
              {msg.supporting_invoice_ids && msg.supporting_invoice_ids.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-[#263B5D] flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Referenced records:
                  </span>
                  {msg.supporting_invoice_ids.map(invId => (
                    <Link
                      key={invId}
                      to={`/invoices/${invId}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#141E34] text-slate-200 border border-[#263B5D] hover:bg-[#1E3A5F] transition-colors font-serif tabular-nums text-[11px]"
                    >
                      <span>Invoice detail</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-serif tabular-nums">{msg.timestamp}</span>
                {msg.confidence !== undefined && (
                  <span className="font-serif tabular-nums">Confidence: {(msg.confidence * 100).toFixed(0)}%</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-[#0F1729] border border-[#263B5D] text-[#8BA2C4] flex items-center justify-center">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-slate-400 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin"></div>
              <span>Reviewing Section 43B(h) records and statutory provisions...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="shrink-0 relative"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything regarding Section 43B(h) exposure, deadlines, or vendor classification..."
          className="w-full pl-4 pr-12 py-3 rounded bg-[#141E34] border border-[#263B5D] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#8BA2C4]"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded bg-[#1E3A5F] hover:bg-[#2A4D7D] text-white border border-[#263B5D] transition-colors disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
