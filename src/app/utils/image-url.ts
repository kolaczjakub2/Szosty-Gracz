export function optimizedImageUrl(url: string, width: number, quality = 76): string {
  if (url.startsWith('/.netlify/images?')) return url;
  if (!shouldUseNetlifyImageService()) return url;
  if (url.startsWith('/')) return url;
  if (!/^https?:\/\//i.test(url)) return url;

  const params = new URLSearchParams({
    url,
    w: String(width),
    q: String(quality),
    fm: 'webp',
  });

  return `/.netlify/images?${params.toString()}`;
}

export function optimizedImageSrcset(url: string, widths: readonly number[]): string {
  return widths.map((width) => `${optimizedImageUrl(url, width)} ${width}w`).join(', ');
}

function shouldUseNetlifyImageService(): boolean {
  const hostname = globalThis.location?.hostname;

  if (hostname) {
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
  }

  const env =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const netlifyImageFlag = env?.['ENABLE_NETLIFY_IMAGE_SERVICE'];

  if (netlifyImageFlag) {
    return netlifyImageFlag.toLowerCase() === 'true';
  }

  return true;
}
