import React from 'react';
import { Copy, Check, ShieldCheck, Clock, Smartphone, Radio } from 'lucide-react';

interface TelegramMessageBubbleProps {
  appDisplayName: string;
  sender?: string;
  title?: string;
  text: string;
  otpCode?: string;
  operator?: string;
  timestamp?: number;
  silent?: boolean;
}

export const TelegramMessageBubble: React.FC<TelegramMessageBubbleProps> = ({
  appDisplayName,
  sender,
  title,
  text,
  otpCode,
  operator,
  timestamp = Date.now(),
  silent = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = () => {
    if (otpCode) {
      navigator.clipboard.writeText(otpCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const timeString = new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full max-w-md mx-auto my-2">
      {/* Telegram Message Container */}
      <div className="relative rounded-2xl rounded-bl-sm bg-[#1e2c3a] text-slate-100 p-3.5 shadow-lg border border-slate-700/40 text-sm font-sans transition-all">
        {/* Top Header: App & Sender */}
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-700/40 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Smartphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-semibold text-sky-400 truncate">{appDisplayName || 'SMS Forwarder'}</span>
            {sender && (
              <>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300 truncate italic">{sender}</span>
              </>
            )}
          </div>
          {silent && (
            <span className="text-[10px] text-slate-400 shrink-0">🔕 Без звука</span>
          )}
        </div>

        {/* Title if present */}
        {title && title !== sender && title !== appDisplayName && (
          <div className="font-semibold text-slate-200 mt-2 text-sm leading-snug">
            {title}
          </div>
        )}

        {/* Message body */}
        <div className="mt-1.5 text-slate-200 whitespace-pre-wrap break-words leading-relaxed text-[13px]">
          {text || 'Текст сообщения отсутствует'}
        </div>

        {/* OTP Code Highlight Box */}
        {otpCode && (
          <div className="mt-2.5 p-2 rounded-lg bg-sky-950/60 border border-sky-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Код подтверждения:</div>
                <div className="font-mono text-base font-bold text-sky-300 tracking-wider">
                  {otpCode}
                </div>
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer shrink-0"
              title="Скопировать код"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Скопировано</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Копировать</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Metadata Footer: Operator and Time (No battery) */}
        <div className="mt-2.5 pt-2 border-t border-slate-700/30 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            {operator && (
              <span className="flex items-center gap-1 font-medium text-slate-300">
                <Radio className="w-3 h-3 text-sky-400" />
                {operator}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-slate-400 font-mono tabular-nums">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{timeString}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
