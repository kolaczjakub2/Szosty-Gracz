import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import {
  getAllowedHosts,
  getContext,
  getTrustProxyHeaders,
} from '@netlify/angular-runtime/app-engine.js';

declare const Netlify: { env: { get(key: string): string | undefined } } | undefined;

const angularAppEngine = new AngularAppEngine({
  allowedHosts: getAllowedHosts(),
  trustProxyHeaders: getTrustProxyHeaders(),
});

const staticPagePaths = new Set([
  '/',
  '/o-nas',
  '/wspieraj',
  '/alert-meczowy',
  '/moje-konto',
  '/moje-konto/login',
  '/moje-konto/forgot-password',
  '/moje-konto/reset-password',
  '/o-nas-2012',
  '/2025/10/22/alert-meczowy',
]);

const latestPostsCacheHeaders = {
  'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=60',
  'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=300, stale-while-revalidate=60',
  'Cache-Tag': 'wp-feed',
};

const NETLIFY_SITE_ID = '1ebd6113-f7a2-4811-b9f0-4b5b504e40de';

const archiveAuthorSlugs = new Set([
  'maciej',
  'adam',
  'sitarzpiotrekgmail-com',
  'staszewski-maciekgmail-com',
  'michalkajzerekyahoo-pl',
  'znykajacy',
  'piotr-kolanowski',
  'przemek',
  'sebastian',
  'sebastian-bielaswp-pl',
]);

const publicAuthorSlugs = new Set([
  'maciej-kwiatkowski',
  'adam-szczepanski',
  'piotr-sitarz',
  'maciej-staszewski',
  'michal-kajzerek',
  'znykajacy',
  'piotr-kolanowski',
  'przemek-kujawinski',
  'sebastian-hetman',
  'sebastian-bielas',
]);

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const archiveAuthorMatch = url.pathname.match(/^\/api\/archive-authors\/([^/]+)$/);

  if (archiveAuthorMatch) {
    return getArchiveAuthorResponse(archiveAuthorMatch[1], url.searchParams);
  }

  if (url.pathname === '/api/post-image') {
    return getPostImageResponse(url.searchParams);
  }

  if (url.pathname === '/api/latest-posts') {
    return getLatestPostsResponse(url.searchParams);
  }

  if (url.pathname === '/api/cache-purge') {
    return purgeWordPressCache(request);
  }

  const response = await angularAppEngine.handle(request, getContext());

  if (!response) {
    return new Response('Not found', { status: 404 });
  }

  if (isKnownPagePath(url.pathname) && url.pathname !== '/404' || response.status >= 300) {
    return withPublicCache(response, request, url.pathname);
  }

  return new Response(response.body, {
    status: 404,
    statusText: 'Not Found',
    headers: response.headers,
  });
}

async function getPostImageResponse(searchParams: URLSearchParams): Promise<Response> {
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return Response.json({ imageUrl: null }, { status: 400 });
  }

  let postUrl: URL;

  try {
    postUrl = new URL(rawUrl);
  } catch {
    return Response.json({ imageUrl: null }, { status: 400 });
  }

  if (postUrl.protocol !== 'https:' || postUrl.hostname !== 'szostygracz.pl') {
    return Response.json({ imageUrl: null }, { status: 400 });
  }

  try {
    const response = await fetch(postUrl, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'SzostyGraczModern/1.0',
      },
    });

    if (!response.ok) {
      return Response.json({ imageUrl: null }, { status: response.status });
    }

    const html = await response.text();
    const imageUrl = extractMetaContent(html, 'og:image') ?? extractSchemaImage(html);

    return Response.json(
      { imageUrl },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch {
    return Response.json({ imageUrl: null }, { status: 502 });
  }
}

function extractSchemaImage(html: string): string | null {
  const imageBlock = /<span[^>]+itemprop=["']image["'][^>]*>[\s\S]{0,600}?<\/span>/i.exec(html)?.[0];

  if (!imageBlock) return null;

  return /<meta[^>]+itemprop=["']url["'][^>]+content=["']([^"']+)["']/i.exec(imageBlock)?.[1] ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']url["']/i.exec(imageBlock)?.[1] ??
    null;
}

function extractMetaContent(html: string, property: string): string | null {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const propertyFirst = new RegExp(
    `<meta[^>]+property=["']${escapedProperty}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const contentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapedProperty}["']`,
    'i',
  );

  return propertyFirst.exec(html)?.[1] ?? contentFirst.exec(html)?.[1] ?? null;
}

function withPublicCache(response: Response, request: Request, path: string): Response {
  const isPrivatePath = path.startsWith('/moje-konto');

  if (request.method !== 'GET' || response.status !== 200 || isPrivatePath) {
    return response;
  }

  const headers = new Headers(response.headers);
  if (path === '/') {
    headers.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=60');
    headers.set('Netlify-CDN-Cache-Control', 'public, durable, s-maxage=300, stale-while-revalidate=60');
    headers.set('Cache-Tag', 'wp-feed');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const edgeTtl = path.startsWith('/artykul/') ? 86400 : 300;
  headers.set('Cache-Control', `public, max-age=0, s-maxage=${edgeTtl}, stale-while-revalidate=30`);
  headers.set('Netlify-CDN-Cache-Control', `public, durable, s-maxage=${edgeTtl}, stale-while-revalidate=30`);

  const articleMatch = path.match(/^\/artykul\/([1-9]\d*)\//);
  if (articleMatch) headers.set('Cache-Tag', `wp-post-${articleMatch[1]}`);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function purgeWordPressCache(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookSecret = getRuntimeEnv('SG_CACHE_PURGE_SECRET');
  const purgeToken = getRuntimeEnv('SG_NETLIFY_PURGE_TOKEN');
  const suppliedSecret = request.headers.get('X-SG-Webhook-Secret');

  if (!webhookSecret || !purgeToken || !suppliedSecret || suppliedSecret !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let postId: number | null = null;
  try {
    const payload = await request.json() as { postId?: unknown };
    const candidate = Number(payload.postId);
    if (Number.isInteger(candidate) && candidate > 0) postId = candidate;
  } catch {
    // A feed-only purge is valid even without a JSON body.
  }

  const cacheTags = ['wp-feed'];
  if (postId) cacheTags.push(`wp-post-${postId}`);

  const response = await fetch('https://api.netlify.com/api/v1/purge', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${purgeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ site_id: NETLIFY_SITE_ID, cache_tags: cacheTags }),
  });

  if (!response.ok) {
    return Response.json({ ok: false, status: response.status }, { status: 502 });
  }

  return Response.json({ ok: true, cacheTags });
}

function getRuntimeEnv(name: string): string | undefined {
  if (typeof Netlify !== 'undefined') return Netlify?.env.get(name);

  const runtime = globalThis as typeof globalThis & {
    Netlify?: { env?: { get(key: string): string | undefined } };
    process?: { env?: Record<string, string | undefined> };
  };

  return runtime.Netlify?.env?.get(name) ?? runtime.process?.env?.[name];
}

async function getArchiveAuthorResponse(
  slug: string,
  searchParams: URLSearchParams,
): Promise<Response> {
  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isInteger(requestedPage) && requestedPage > 1 ? requestedPage : 1;

  if (!archiveAuthorSlugs.has(slug)) {
    return new Response('Nieznany autor.', { status: 404 });
  }

  const path = page > 1 ? `/author/${slug}/page/${page}/` : `/author/${slug}/`;

  try {
    const response = await fetch(`https://szostygracz.pl${path}`, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'SzostyGraczModern/1.0',
      },
    });

    if (!response.ok) {
      return new Response('Nie udało się pobrać archiwum autora.', {
        status: response.status,
      });
    }

    return new Response(await response.text(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new Response('Nie udało się pobrać archiwum autora.', { status: 502 });
  }
}

async function getLatestPostsResponse(searchParams: URLSearchParams): Promise<Response> {
  const requestedPage = Number(searchParams.get('page'));
  const requestedPerPage = Number(searchParams.get('per_page'));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const perPage = Number.isInteger(requestedPerPage) && requestedPerPage > 0 ? requestedPerPage : 16;
  const params = new URLSearchParams(searchParams);

  params.set('page', String(page));
  params.set('per_page', String(perPage));

  try {
    const response = await fetch(`https://szostygracz.pl/wp-json/wp/v2/posts?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SzostyGraczModern/1.0',
      },
    });

    if (!response.ok) {
      return new Response('Nie udało się pobrać najnowszych wpisów.', {
        status: response.status,
      });
    }

    const headers = new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      ...latestPostsCacheHeaders,
    });

    const total = response.headers.get('X-WP-Total');
    const totalPages = response.headers.get('X-WP-TotalPages');

    if (total) headers.set('X-WP-Total', total);
    if (totalPages) headers.set('X-WP-TotalPages', totalPages);

    return new Response(await response.text(), {
      headers,
    });
  } catch {
    return new Response('Nie udało się pobrać najnowszych wpisów.', { status: 502 });
  }
}

function isKnownPagePath(path: string): boolean {
  const normalizedPath = path.length > 1 ? path.replace(/\/+$/, '') : path;

  return (
    staticPagePaths.has(normalizedPath) ||
    /^\/artykul\/[1-9]\d*\/[^/]+$/.test(normalizedPath) ||
    (normalizedPath.startsWith('/autor/') && publicAuthorSlugs.has(normalizedPath.slice(7)))
  );
}

export const reqHandler = createRequestHandler(netlifyAppEngineHandler);
