import { AppCategory, AppFilterRule } from '../types';

export function categorizeApp(packageName: string, appName: string): { category: AppCategory; extractOtp: boolean } {
  const p = packageName.toLowerCase();
  const n = appName.toLowerCase();

  if (p.includes('messaging') || p.includes('mms') || p.includes('sms')) {
    return { category: 'sms', extractOtp: true };
  }
  if (
    p.includes('bank') ||
    p.includes('finance') ||
    p.includes('sber') ||
    p.includes('tinkoff') ||
    p.includes('tbank') ||
    p.includes('vtb') ||
    p.includes('alfabank') ||
    p.includes('pay') ||
    n.includes('банк') ||
    n.includes('пей')
  ) {
    return { category: 'banking', extractOtp: true };
  }
  if (
    p.includes('whatsapp') ||
    p.includes('telegram') ||
    p.includes('viber') ||
    p.includes('vkontakte') ||
    p.includes('messenger') ||
    p.includes('discord') ||
    p.includes('signal') ||
    n.includes('чат') ||
    n.includes('мессенджер')
  ) {
    return { category: 'messenger', extractOtp: false };
  }
  if (
    p.includes('ozon') ||
    p.includes('wildberries') ||
    p.includes('market') ||
    p.includes('aliexpress') ||
    p.includes('avito') ||
    p.includes('yandex.market') ||
    n.includes('маркет') ||
    n.includes('магазин')
  ) {
    return { category: 'marketplace', extractOtp: false };
  }
  if (
    p.includes('delivery') ||
    p.includes('samokat') ||
    p.includes('eats') ||
    p.includes('food') ||
    p.includes('scooter') ||
    p.includes('dostavka') ||
    n.includes('доставка') ||
    n.includes('самокат')
  ) {
    return { category: 'delivery', extractOtp: false };
  }
  if (p.includes('gosuslugi') || p.includes('gov') || n.includes('госуслуги') || n.includes('налог')) {
    return { category: 'government', extractOtp: true };
  }
  if (p.includes('android') || p.includes('system') || p.includes('google')) {
    return { category: 'system', extractOtp: false };
  }
  return { category: 'custom', extractOtp: false };
}

export function syncDeviceApps(
  existingRules: AppFilterRule[],
  purgeUninstalled: boolean = true
): { updatedRules: AppFilterRule[]; addedCount: number; purgedCount: number } {
  if (typeof window === 'undefined' || !window.AndroidBridge?.getInstalledApps) {
    return { updatedRules: existingRules, addedCount: 0, purgedCount: 0 };
  }

  try {
    const jsonStr = window.AndroidBridge.getInstalledApps();
    const rawApps: { packageName: string; appName: string; isSystem: boolean }[] = JSON.parse(jsonStr || '[]');

    if (!Array.isArray(rawApps) || rawApps.length === 0) {
      return { updatedRules: existingRules, addedCount: 0, purgedCount: 0 };
    }

    const devicePackageSet = new Set(rawApps.map((a) => a.packageName));

    // Remove predefined apps that are NOT installed on this device (except system SMS and manual custom apps)
    let purgedCount = 0;
    let filteredRules = existingRules;

    if (purgeUninstalled) {
      filteredRules = existingRules.filter((r) => {
        if (r.category === 'sms' || r.isCustom) return true;
        const isInstalled = devicePackageSet.has(r.packageName);
        if (!isInstalled) purgedCount++;
        return isInstalled;
      });
    }

    const existingMap = new Map(filteredRules.map((r) => [r.packageName, r]));
    let addedCount = 0;
    const newRulesList = [...filteredRules];

    for (const app of rawApps) {
      if (!app.packageName) continue;

      if (!existingMap.has(app.packageName)) {
        const { category, extractOtp } = categorizeApp(app.packageName, app.appName);
        const newRule: AppFilterRule = {
          id: `app_${app.packageName.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: app.appName || app.packageName,
          packageName: app.packageName,
          category,
          enabled: true,
          filterMode: 'all',
          keywords: [],
          excludeKeywords: [],
          extractOtp,
          silent: false,
          installedOnDevice: true,
          discoveredFromDevice: true,
        };
        newRulesList.push(newRule);
        existingMap.set(app.packageName, newRule);
        addedCount++;
      } else {
        const existing = existingMap.get(app.packageName)!;
        existing.installedOnDevice = true;
      }
    }

    return { updatedRules: newRulesList, addedCount, purgedCount };
  } catch (e) {
    console.error('Failed to sync device apps', e);
    return { updatedRules: existingRules, addedCount: 0, purgedCount: 0 };
  }
}
