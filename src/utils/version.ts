export const CURRENT_VERSION = '1.0.12';
export const GITHUB_REPO = 'vegych/PushToWeb';
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const GITHUB_LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  downloadUrl: string;
  releaseNotes?: string;
  publishedAt?: string;
}

export async function checkAppUpdate(): Promise<VersionInfo> {
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

      const hasUpdate = isVersionNewer(CURRENT_VERSION, latestTag);

      return {
        currentVersion: CURRENT_VERSION,
        latestVersion: latestTag || CURRENT_VERSION,
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
        currentVersion: CURRENT_VERSION,
        latestVersion: data.latestVersion || CURRENT_VERSION,
        hasUpdate: isVersionNewer(CURRENT_VERSION, data.latestVersion || CURRENT_VERSION),
        downloadUrl: data.downloadUrl || GITHUB_RELEASES_URL,
        releaseNotes: data.releaseNotes,
      };
    }
  } catch (e) {
    // Ignore error
  }

  return {
    currentVersion: CURRENT_VERSION,
    latestVersion: CURRENT_VERSION,
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
