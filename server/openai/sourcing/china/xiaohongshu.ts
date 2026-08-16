export const XIAOHONGSHU_DOMAIN = "xiaohongshu.com";

export function isXiaohongshuUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === XIAOHONGSHU_DOMAIN || host.endsWith(`.${XIAOHONGSHU_DOMAIN}`);
  } catch {
    return /xiaohongshu\.com/i.test(url);
  }
}
