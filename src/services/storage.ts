import { AppFilterRule, ForwardedMessageLog, ForwardingSettings } from '../types';
import { DEFAULT_SETTINGS, PREDEFINED_APPS } from '../data/predefinedApps';

const SETTINGS_KEY = 'smsf_settings_v1';
const RULES_KEY = 'smsf_rules_v1';
const LOGS_KEY = 'smsf_logs_v1';

export function loadSettings(): ForwardingSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { 
        ...DEFAULT_SETTINGS, 
        ...parsed,
        // If user never had explicit setting or both were previously false by default, default to true
        forwardSmsEnabled: parsed.forwardSmsEnabled !== undefined ? parsed.forwardSmsEnabled : true,
        forwardPushEnabled: parsed.forwardPushEnabled !== undefined ? parsed.forwardPushEnabled : true,
      };
    }
  } catch (e) {
    console.error('Failed to load settings from localStorage', e);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: ForwardingSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Also sync to backend API if available
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).catch(() => {
      // Background sync, silently catch in offline/local-only
    });
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}

const DEFAULT_INITIAL_RULES: AppFilterRule[] = [];

export function loadRules(): AppFilterRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (raw) {
      const saved: AppFilterRule[] = JSON.parse(raw);
      if (Array.isArray(saved)) {
        return saved;
      }
    }
  } catch (e) {
    console.error('Failed to load rules from localStorage', e);
  }
  return DEFAULT_INITIAL_RULES;
}

export function saveRules(rules: AppFilterRule[]): void {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
    // Sync to Android Native Bridge if running inside APK
    if (typeof window !== 'undefined' && window.AndroidBridge?.syncAppRules) {
      try {
        window.AndroidBridge.syncAppRules(JSON.stringify(rules));
      } catch (e) {
        console.error('Failed to sync rules to AndroidBridge', e);
      }
    }
    // Also sync to backend API if available
    fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rules),
    }).catch(() => {});
  } catch (e) {
    console.error('Failed to save rules to localStorage', e);
  }
}

export function loadLogs(): ForwardedMessageLog[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load logs', e);
  }
  return [];
}

export function saveLogs(logs: ForwardedMessageLog[]): void {
  try {
    // Keep max 200 logs in storage
    const trimmed = logs.slice(0, 200);
    localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save logs', e);
  }
}
