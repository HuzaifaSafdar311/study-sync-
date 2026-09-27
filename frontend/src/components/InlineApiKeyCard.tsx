import React, { useState } from 'react';
import { Key, Eye, EyeOff, Clipboard, Check, ExternalLink, Loader2, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface InlineApiKeyCardProps {
  onSave: (provider: 'groq' | 'gemini', key: string) => Promise<boolean | void>;
  isSaving: boolean;
  error?: string | null;
  initialProvider?: 'groq' | 'gemini';
  onClose?: () => void;
  isModal?: boolean;
}

export default function InlineApiKeyCard({
  onSave,
  isSaving,
  error,
  initialProvider = 'groq',
  onClose,
  isModal = false,
}: InlineApiKeyCardProps) {
  const [provider, setProvider] = useState<'groq' | 'gemini'>(initialProvider);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKey(text.trim());
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 1500);
      }
    } catch {
      toast('Please paste your key manually (Ctrl+V / Cmd+V)', { icon: '📋' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error('Please enter an API key.');
      return;
    }
    onSave(provider, apiKey.trim());
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1.5px solid #E0E7FF',
        boxShadow: isModal
          ? '0 20px 40px -15px rgba(0, 0, 0, 0.15)'
          : '0 4px 20px -2px rgba(99, 102, 241, 0.1)',
        padding: '22px',
        maxWidth: isModal ? '520px' : '580px',
        width: '100%',
        margin: isModal ? '0 auto' : '14px 0',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              flexShrink: 0,
            }}
          >
            <Key size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1E1B4B' }}>
                Enter your API
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  border: '1px solid #FECACA',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                Free Limit (3/3) Reached
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748B', lineHeight: 1.4 }}>
              System AI limit has been reached. To continue the chatbot, please enter your API key.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: 4,
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
        {/* Provider Selector Tabs */}
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 8 }}>
          Select Provider:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {/* Groq Option */}
          <button
            type="button"
            onClick={() => setProvider('groq')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: '10px',
              border: provider === 'groq' ? '2px solid #4F46E5' : '1px solid #E2E8F0',
              background: provider === 'groq' ? '#EEF2FF' : '#F8FAFC',
              color: provider === 'groq' ? '#4338CA' : '#475569',
              fontWeight: provider === 'groq' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Zap size={16} color={provider === 'groq' ? '#4F46E5' : '#64748B'} />
            <span>Groq (Recommended ⚡)</span>
          </button>

          {/* Gemini Option */}
          <button
            type="button"
            onClick={() => setProvider('gemini')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: '10px',
              border: provider === 'gemini' ? '2px solid #4F46E5' : '1px solid #E2E8F0',
              background: provider === 'gemini' ? '#EEF2FF' : '#F8FAFC',
              color: provider === 'gemini' ? '#4338CA' : '#475569',
              fontWeight: provider === 'gemini' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={16} color={provider === 'gemini' ? '#4F46E5' : '#64748B'} />
            <span>Google Gemini</span>
          </button>
        </div>

        {/* Input Field with Paste & Eye toggle */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
            {provider === 'groq' ? 'Groq API Key' : 'Google Gemini API Key'}:
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'groq' ? 'gsk_...' : 'AIzaSy...'}
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '10px 75px 10px 14px',
                borderRadius: '10px',
                border: error ? '1.5px solid #EF4444' : '1.5px solid #CBD5E1',
                fontSize: '0.88rem',
                outline: 'none',
                background: '#FFFFFF',
                color: '#0F172A',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#4F46E5')}
              onBlur={(e) => (e.target.style.borderColor = error ? '#EF4444' : '#CBD5E1')}
            />
            <div
              style={{
                position: 'absolute',
                right: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {hasCopied ? <Check size={16} color="#10B981" /> : <Clipboard size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                title={showKey ? 'Hide key' : 'Show key'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              fontSize: '0.8rem',
              marginBottom: 12,
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        {/* Free Key Helper Links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#64748B',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {provider === 'groq' ? (
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: '#4F46E5',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <span>Groq Console se free key lein (100% Free)</span>
              <ExternalLink size={12} />
            </a>
          ) : (
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: '#4F46E5',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <span>Get Free key</span>
              <ExternalLink size={12} />
            </a>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontWeight: 500 }}>
            <ShieldCheck size={14} />
            <span>Encrypted with AES-256-GCM</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isSaving || !apiKey.trim()}
          style={{
            width: '100%',
            background: isSaving || !apiKey.trim()
              ? '#CBD5E1'
              : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '11px 16px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: isSaving || !apiKey.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: isSaving || !apiKey.trim() ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.3)',
            transition: 'all 0.15s ease',
          }}
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Validating & Saving...</span>
            </>
          ) : (
            <>
              <Key size={16} />
              <span>Save API Key & Continue Chatting</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
