import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import {
  getAllowedHosts,
  getContext,
  getTrustProxyHeaders,
} from '@netlify/angular-runtime/app-engine.js';

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
  'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
  'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=300, stale-while-revalidate=86400',
};

const archiveAuthorSlugs = new Set([
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
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('Netlify-CDN-Cache-Control', 'no-store');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const edgeTtl = 300;
  headers.set('Cache-Control', `public, max-age=0, s-maxage=${edgeTtl}, stale-while-revalidate=86400`);
  headers.set('Netlify-CDN-Cache-Control', `public, durable, s-maxage=${edgeTtl}, stale-while-revalidate=86400`);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
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
