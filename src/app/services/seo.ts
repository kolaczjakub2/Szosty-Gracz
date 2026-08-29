import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { ArticleDetail } from '../models/wordpress';
import { articlePath } from '../utils/article-route';
import { optimizedImageSrcset, optimizedImageUrl } from '../utils/image-url';

interface SeoPageConfig {
  readonly title: string;
  readonly description: string;
  readonly path?: string;
  readonly type?: 'website' | 'article';
  readonly image?: string;
  readonly robots?: string;
  readonly publishedTime?: string;
  readonly structuredData?: Record<string, unknown> | readonly Record<string, unknown>[];
}

const SITE_NAME = 'Szósty Gracz';
const HOME_TITLE = 'Szósty Gracz — NBA po polsku';
const HOME_DESCRIPTION = 'Najnowsze informacje, analizy, komentarze i podcasty o NBA po polsku.';
const DEFAULT_SOCIAL_IMAGE = '/szosty-gracz-logo.png';
const PRODUCTION_ORIGIN = 'https://szostygracz.pl';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  setHome(heroImageUrl?: string): void {
    const canonicalUrl = this.absoluteUrl('/');

    this.apply({
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      path: '/',
      image: heroImageUrl || DEFAULT_SOCIAL_IMAGE,
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          alternateName: '6G',
          url: canonicalUrl,
          inLanguage: 'pl-PL',
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: SITE_NAME,
          url: canonicalUrl,
          logo: this.absoluteUrl('/szosty-gracz-logo.png'),
          sameAs: [
            'https://www.facebook.com/szostygracz/',
            'https://twitter.com/SzostyGracz',
          ],
        },
      ],
    });

    this.setHomeImagePreloads(heroImageUrl);
  }

  setStaticPage(title: string, description: string, path: string, robots?: string): void {
    this.apply({ title, description, path, robots, image: DEFAULT_SOCIAL_IMAGE });
  }

  setAuthor(name: string, description: string, path: string): void {
    const url = this.absoluteUrl(path);

    this.apply({
      title: `${name} — autor | ${SITE_NAME}`,
      description,
      path,
      image: DEFAULT_SOCIAL_IMAGE,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        url,
        mainEntity: {
          '@type': 'Person',
          name,
          url,
        },
      },
    });

  }

  setArticle(article: ArticleDetail): void {
    const path = articlePath(article);
    const canonicalUrl = this.absoluteUrl(path);
    const imageUrl = article.heroImageUrl || article.imageUrl;

    this.apply({
      title: `${article.title} | ${SITE_NAME}`,
      description: article.excerpt,
      path,
      type: 'article',
      publishedTime: article.date.toISOString(),
      image: imageUrl,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.excerpt,
        datePublished: article.date.toISOString(),
        mainEntityOfPage: canonicalUrl,
        image: [this.absoluteUrl(imageUrl)],
        author: {
          '@type': 'Person',
          name: article.authorName,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: {
            '@type': 'ImageObject',
            url: this.absoluteUrl('/szosty-gracz-logo.png'),
          },
        },
        inLanguage: 'pl-PL',
      },
    });

    this.setPrimaryImagePreload(
      imageUrl,
      [480, 700],
      700,
      78,
      '(max-width: 760px) 100vw, (max-width: 1200px) calc(100vw - 64px), 1120px',
    );
  }

  setNotFound(): void {
    this.apply({
      title: `404 — Nie znaleziono strony | ${SITE_NAME}`,
      description: 'Nie znaleziono strony pod tym adresem.',
      robots: 'noindex, follow',
    });
  }

  private apply(config: SeoPageConfig): void {
    const type = config.type ?? 'website';
    const canonicalUrl = config.path ? this.absoluteUrl(config.path) : undefined;
    const imageUrl = config.image ? this.absoluteUrl(config.image) : undefined;

    this.title.setTitle(config.title);
    this.meta.updateTag({ name: 'description', content: config.description });
    this.meta.updateTag({ name: 'robots', content: config.robots ?? 'index, follow' });
    this.meta.updateTag({ property: 'og:locale', content: 'pl_PL' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:card', content: imageUrl ? 'summary_large_image' : 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });

    this.updateOptionalMeta("property='og:url'", 'property', 'og:url', canonicalUrl);
    this.updateOptionalMeta("property='og:image'", 'property', 'og:image', imageUrl);
    this.updateOptionalMeta(
      "property='article:published_time'",
      'property',
      'article:published_time',
      type === 'article' ? config.publishedTime : undefined,
    );
    this.updateOptionalMeta("name='twitter:image'", 'name', 'twitter:image', imageUrl);
    this.setCanonicalUrl(canonicalUrl);
    this.setStructuredData(config.structuredData);
  }

  private updateOptionalMeta(
    selector: string,
    attribute: 'name' | 'property',
    key: string,
    content?: string,
  ): void {
    if (content) {
      this.meta.updateTag({ [attribute]: key, content });
      return;
    }

    this.meta.removeTag(selector);
  }

  private setCanonicalUrl(url?: string): void {
    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!url) {
      canonical?.remove();
      return;
    }

    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }

    canonical.href = url;
  }

  private setStructuredData(data?: Record<string, unknown> | readonly Record<string, unknown>[]): void {
    const id = 'seo-structured-data';
    let script = this.document.getElementById(id) as HTMLScriptElement | null;

    if (!data) {
      script?.remove();
      return;
    }

    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
  }

  private setPrimaryImagePreload(
    imageUrl: string | undefined,
    widths: readonly number[],
    fallbackWidth: number,
    quality: number,
    sizes: string,
  ): void {
    this.clearPrimaryImagePreloads();

    if (!imageUrl) {
      return;
    }

    const link = this.createPrimaryImagePreload();

    link.href = optimizedImageUrl(imageUrl, fallbackWidth, quality);
    link.setAttribute('imagesrcset', optimizedImageSrcset(imageUrl, widths));
    link.setAttribute('imagesizes', sizes);
  }

  private setHomeImagePreloads(imageUrl: string | undefined): void {
    this.clearPrimaryImagePreloads();
    if (!imageUrl) return;

    const mobile = this.createPrimaryImagePreload();
    mobile.media = '(max-width: 760px)';
    mobile.href = optimizedImageUrl(imageUrl, 480, 82);

    const desktop = this.createPrimaryImagePreload();
    desktop.media = '(min-width: 761px)';
    desktop.href = optimizedImageUrl(imageUrl, 960, 82);
    desktop.setAttribute('imagesrcset', optimizedImageSrcset(imageUrl, [720, 960, 1200, 1440], 82));
    desktop.setAttribute('imagesizes', '(max-width: 1200px) 70vw, 720px');
  }

  private createPrimaryImagePreload(): HTMLLinkElement {
    const link = this.document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.setAttribute('data-primary-image-preload', 'true');
    this.document.head.appendChild(link);
    return link;
  }

  private clearPrimaryImagePreloads(): void {
    this.document.head
      .querySelectorAll<HTMLLinkElement>('link[data-primary-image-preload="true"]')
      .forEach((link) => link.remove());
  }

  private absoluteUrl(pathOrUrl: string): string {
    const currentOrigin = this.document.location.origin;
    const hostname = this.document.location.hostname;
    const baseUrl = hostname === 'localhost' || hostname === '127.0.0.1'
      ? currentOrigin
      : PRODUCTION_ORIGIN;

    return new URL(pathOrUrl, baseUrl).href;
  }
}
