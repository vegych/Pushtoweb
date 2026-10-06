import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Trash2, 
  Download, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Send, 
  ChevronDown, 
  ChevronRight,
  Clock,
  Layers,
  Info
} from 'lucide-react';
import { ForwardedMessageLog, ForwardingSettings } from '../types';
import { sendTelegramMessage } from '../services/telegram';

interface LogsTabProps {
  logs: ForwardedMessageLog[];
  settings: ForwardingSettings;
  onClearLogs: () => void;
  onRefreshLogs: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  logs,
  settings,
  onClearLogs,
  onRefreshLogs,
  onShowToast,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'forwarded' | 'blocked' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isResending, setIsResending] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-polling every 4 seconds to pick up phone messages sent via webhook
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      onRefreshLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefreshLogs]);

  // Filtered list
  const filteredLogs = logs.filter((log) => {
    const matchesStatus = filterStatus === 'all' ? true : log.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      log.appName.toLowerCase().includes(q) ||
      log.sender.toLowerCase().includes(q) ||
      log.text.toLowerCase().includes(q) ||
      (log.otpCode && log.otpCode.includes(q));

    return matchesStatus && matchesSearch;
  });

  // Stats calculation
  const totalCount = logs.length;
  const forwardedCount = logs.filter((l) => l.status === 'forwarded').length;
  const blockedCount = logs.filter((l) => l.status === 'blocked').length;
  const errorCount = logs.filter((l) => l.status === 'error').length;

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sms_forwarder_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('Журнал экспортирован в JSON', 'success');
  };

  const handleResend = async (log: ForwardedMessageLog, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      onShowToast('Telegram бот не настроен', 'error');
      return;
    }

    setIsResending(log.id);
    try {
      const formatted = `📲 <b>${log.appName}</b> · <i>${log.sender}</i>\n${log.text}${log.otpCode ? `\n\n🔑 Код: <code>${log.otpCode}</code>` : ''}`;
      const res = await sendTelegramMessage(
        settings.telegramBotToken,
        settings.telegramChatId,
        formatted,
        false,
        settings.telegramApiEndpoint
      );
      if (res.success) {
        onShowToast(`Сообщение ${log.id} повторно отправлено в Telegram!`, 'success');
      } else {
        onShowToast(`Ошибка отправки: ${res.error}`, 'error');
      }
    } finally {
      setIsResending(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Banner & Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Всего обработано</div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {totalCount}
          </div>
        </div>

        {/* Forwarded */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Переслано в Telegram
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {forwardedCount}
          </div>
        </div>

        {/* Blocked */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Отфильтровано
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {blockedCount}
          </div>
        </div>

        {/* Errors */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Ошибки
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
            {errorCount}
          </div>
        </div>
      </div>

      {/* Control bar: Filters, Search, Export, Clear */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'Все записи' },
            { id: 'forwarded', label: 'Переслано' },
            { id: 'blocked', label: 'Заблокировано' },
            { id: 'error', label: 'Ошибки' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterStatus(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filterStatus === item.id
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по тексту или коду..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="button"
            onClick={onRefreshLogs}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Обновить журнал"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={logs.length === 0}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
            title="Экспортировать в JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/40 hover:text-rose-300 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
            title="Очистить журнал"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="space-y-2">
        {filteredLogs.map((log) => {
          const isExpanded = expandedLogId === log.id;
          const timeStr = new Date(log.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          const dateStr = new Date(log.timestamp).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
          });

          return (
            <div
              key={log.id}
              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
              className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                log.status === 'forwarded'
                  ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'
                  : log.status === 'blocked'
                  ? 'bg-slate-900/70 border-slate-800/80 hover:border-amber-500/40'
                  : 'bg-rose-950/20 border-rose-900/50 hover:border-rose-500/50'
              }`}
            >
              {/* Row Header */}
              <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                {/* Left zone: Status icon, App, Sender, Time */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    {log.status === 'forwarded' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {log.status === 'blocked' && (
                      <XCircle className="w-4 h-4 text-amber-400" />
                    )}
                    {log.status === 'error' && (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-slate-500 text-[11px] shrink-0 tabular-nums">
                    <span>{dateStr}</span>
                    <span>{timeStr}</span>
                  </div>

                  <div className="font-semibold text-white truncate shrink-0">
                    {log.appName || (log.type === 'sms' ? 'SMS' : 'Уведомление')}
                  </div>

                  {log.sender && (
                    <span className="text-slate-400 truncate shrink-0 italic">
                      · {log.sender}
                    </span>
                  )}

                  {/* OTP badge if present */}
                  {log.otpCode && (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[11px] flex items-center gap-1 shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                      {log.otpCode}
                    </span>
                  )}
                </div>

                {/* Right zone: Text preview & quick actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <span className="text-slate-400 truncate max-w-xs md:max-w-md text-left">
                    {log.title ? `${log.title}: ${log.text}` : log.text}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleResend(log, e)}
                      disabled={isResending === log.id}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Повторить отправку в Telegram"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>

                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/40 space-y-3 text-xs">
                  {/* Status explanation */}
                  <div>
                    <span className="text-slate-500 font-medium">Статус: </span>
                    <span
                      className={`font-semibold ${
                        log.status === 'forwarded'
                          ? 'text-emerald-400'
                          : log.status === 'blocked'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {log.status === 'forwarded' && 'Переслано в Telegram'}
                      {log.status === 'blocked' && `Заблокировано (${log.blockedReason || 'правило фильтра'})`}
                      {log.status === 'error' && `Ошибка (${log.errorDetails})`}
                    </span>
                    {log.telegramMessageId && (
                      <span className="text-slate-500 ml-2 font-mono">
                        (TG Message ID: {log.telegramMessageId})
                      </span>
                    )}
                  </div>

                  {/* Full Text */}
                  <div>
                    <div className="text-slate-500 font-medium mb-1">Полный текст:</div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-wrap break-words">
                      {log.text}
                    </div>
                  </div>

                  {/* Raw JSON inspection */}
                  {log.rawPayload && (
                    <div>
                      <div className="text-slate-500 font-medium mb-1">Сырые данные от устройства (Payload):</div>
                      <pre className="p-3 rounded-lg bg-slate-950 border border-slate-900 text-slate-400 font-mono text-[10px] overflow-x-auto">
                        {JSON.stringify(log.rawPayload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredLogs.length === 0 && (
          <div className="text-center py-16 p-8 rounded-2xl bg-slate-900 border border-slate-800">
            <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <div className="text-slate-300 font-semibold text-sm">Журнал пересылки пуст</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Здесь будут отображаться все входящие СМС и уведомления с телефона, а также результаты их фильтрации.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
