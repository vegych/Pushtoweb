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
      return { ...DEFAULT_SETTINGS, ...parsed };
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

export function loadRules(): AppFilterRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (raw) {
      const saved: AppFilterRule[] = JSON.parse(raw);
      // Merge with predefined apps so newly added default apps are present
      const savedMap = new Map(saved.map((r) => [r.id, r]));
      const merged = PREDEFINED_APPS.map((pre) => {
        return savedMap.has(pre.id) ? { ...pre, ...savedMap.get(pre.id) } : pre;
      });
      // Add custom rules created by user
      const customRules = saved.filter((r) => r.isCustom && !merged.some((m) => m.id === r.id));
      return [...merged, ...customRules];
    }
  } catch (e) {
    console.error('Failed to load rules from localStorage', e);
  }
  return [...PREDEFINED_APPS];
}

export function saveRules(rules: AppFilterRule[]): void {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
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
