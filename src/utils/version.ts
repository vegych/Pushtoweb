export const CURRENT_VERSION = '1.1.18';
export const GITHUB_REPO = 'vegych/PushToWeb';
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const GITHUB_LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export type ReleaseType = 'major' | 'feature' | 'patch';

export function getReleaseType(current: string, latest: string): ReleaseType {
  const cParts = current.replace(/^v/i, '').split('.').map(Number);
  const lParts = latest.replace(/^v/i, '').split('.').map(Number);

  const cMajor = cParts[0] || 0;
  const lMajor = lParts[0] || 0;
  const cMinor = cParts[1] || 0;
  const lMinor = lParts[1] || 0;

  if (lMajor > cMajor) return 'major';
  if (lMinor > cMinor) return 'feature';
  return 'patch';
}

export function getReleaseTypeBadge(type: ReleaseType, lang: 'ru' | 'en' = 'ru'): { label: string; bgClass: string } {
  if (type === 'major') {
    return {
      label: lang === 'ru' ? '🚀 Мажорное обновление' : '🚀 Major Update',
      bgClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    };
  }
  if (type === 'feature') {
    return {
      label: lang === 'ru' ? '✨ Крупный релиз (X.1.0)' : '✨ Feature Release (X.1.0)',
      bgClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    };
  }
  return {
    label: lang === 'ru' ? '🛠️ Патч / Исправление (X.X.1)' : '🛠️ Bugfix Patch (X.X.1)',
    bgClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };
}

export function getInstalledVersion(): string {
  if (typeof window !== 'undefined' && window.AndroidBridge?.getAppVersionName) {
    try {
      const nativeVer = window.AndroidBridge.getAppVersionName();
      if (nativeVer) return nativeVer;
    } catch (e) {
      console.warn('Failed to fetch native app version', e);
    }
  }
  return CURRENT_VERSION;
}

export interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  downloadUrl: string;
  releaseNotes?: string;
  publishedAt?: string;
}

export async function checkAppUpdate(): Promise<VersionInfo> {
  const currentVer = getInstalledVersion();
  try {
    const res = await fetch(GITHUB_LATEST_RELEASE_API, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (res.ok) {
      const data = await res.json();
      const latestTag = (data.tag_name || data.name || '').replace(/^v/i, '').trim();
      const apkAsset = data.assets?.find((a: { name?: string; browser_download_url?: string }) =>
        a.name?.endsWith('.apk')
      );
      const downloadUrl = apkAsset?.browser_download_url || data.html_url || GITHUB_RELEASES_URL;

      const hasUpdate = isVersionNewer(currentVer, latestTag);

      return {
        currentVersion: currentVer,
        latestVersion: latestTag || currentVer,
        hasUpdate,
        downloadUrl,
        releaseNotes: data.body || 'Новые исправления и улучшения производительности.',
        publishedAt: data.published_at,
      };
    }
  } catch (err) {
    console.warn('GitHub release check failed, using local backend fallback', err);
  }

  // Fallback to local server endpoint
  try {
    const res = await fetch('/api/version');
    if (res.ok) {
      const data = await res.json();
      return {
        currentVersion: currentVer,
        latestVersion: data.latestVersion || currentVer,
        hasUpdate: isVersionNewer(currentVer, data.latestVersion || currentVer),
        downloadUrl: data.downloadUrl || GITHUB_RELEASES_URL,
        releaseNotes: data.releaseNotes,
      };
    }
  } catch (e) {
    // Ignore error
  }

  return {
    currentVersion: currentVer,
    latestVersion: currentVer,
    hasUpdate: false,
    downloadUrl: GITHUB_RELEASES_URL,
  };
}

export function isVersionNewer(current: string, latest: string): boolean {
  if (!latest) return false;
  const cParts = current.replace(/^v/i, '').split('.').map(Number);
  const lParts = latest.replace(/^v/i, '').split('.').map(Number);

  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}
