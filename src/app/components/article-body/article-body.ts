import { DOCUMENT, DatePipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { ArticleDetail, ArticleTag, ArticleTerm } from '../../models/wordpress';
import { optimizedImageSrcset, optimizedImageUrl } from '../../utils/image-url';
import { preventPolishOrphans, preventPolishOrphansInHtml } from '../../utils/polish-typography';
import { ArticleTags } from '../article-tags/article-tags';
import { ArticleSupport } from '../article-support/article-support';

interface TwitterWindow extends Window {
  twttr?: {
    widgets?: {
      load(element?: HTMLElement): Promise<unknown> | void;
    };
  };
}

@Component({
  selector: 'app-article-body',
  imports: [ArticleTags, ArticleSupport, DatePipe],
  templateUrl: './article-body.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleBody {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sanitizer = inject(DomSanitizer);
  readonly optimizedImageUrl = optimizedImageUrl;
  readonly optimizedImageSrcset = optimizedImageSrcset;
  readonly article = input.required<ArticleDetail>();
  readonly tagSelected = output<ArticleTag>();
  readonly termSelected = output<ArticleTerm>();
  readonly formattedTitle = computed(() => preventPolishOrphans(this.article().title));
  readonly isLowResolutionHero = computed(() => {
    const width = this.article().heroImageWidth;
    return typeof width === 'number' && width > 0 && width < 1200;
  });
  readonly readingTime = computed(() => {
    const text = this.article().contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return Math.max(1, Math.ceil(text.split(' ').filter(Boolean).length / 210));
  });
  readonly contentHtml = computed<SafeHtml>(() => {
    const article = this.article();
    const content = this.removeDuplicateLeadingImage(article.contentHtml, article.imageUrl);

    const formattedContent = preventPolishOrphansInHtml(content);

    return this.sanitizer.bypassSecurityTrustHtml(
      this.deferVideoEmbeds(this.removeTwitterScripts(formattedContent)),
    );
  });

  constructor() {
    effect(() => {
      this.article().id;
      if (!isPlatformBrowser(this.platformId)) return;

      const timeout = this.document.defaultView?.setTimeout(() => this.renderTwitterEmbeds(), 0);
      if (timeout !== undefined) {
        this.destroyRef.onDestroy(() => this.document.defaultView?.clearTimeout(timeout));
      }
    });
  }

  activateEmbeddedVideo(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const youtubePlaceholder = target.closest<HTMLButtonElement>(
      '.lite-youtube[data-youtube-id]',
    );
    const videoId = youtubePlaceholder?.dataset['youtubeId'];

    if (youtubePlaceholder && videoId && /^[\w-]{6,}$/.test(videoId)) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1`;
      iframe.title = youtubePlaceholder.getAttribute('aria-label') ?? 'Film YouTube';
      iframe.loading = 'lazy';
      iframe.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      youtubePlaceholder.replaceWith(iframe);
      return;
    }

    const placeholder = target.closest<HTMLButtonElement>(
      '.article-embed-placeholder[data-embed-src]',
    );
    const source = placeholder?.dataset['embedSrc'];
    if (!placeholder || !source) return;

    let embedUrl: URL;
    try {
      embedUrl = new URL(source);
    } catch {
      return;
    }

    if (embedUrl.protocol !== 'https:' || !/(^|\.)streamable\.com$/i.test(embedUrl.hostname)) {
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = embedUrl.toString();
    iframe.title = 'Odtwarzacz wideo Streamable';
    iframe.loading = 'lazy';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    placeholder.replaceWith(iframe);
  }

  private deferVideoEmbeds(html: string): string {
    const withoutYouTubeIframes = html.replace(
      /<iframe\b([^>]*?)\bsrc=(['"])(?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([\w-]{6,})([^'"]*)\2([^>]*)>(?:\s*<\/iframe>)?/gi,
      (_iframe, _before: string, _quote: string, videoId: string) =>
        `<button type="button" class="lite-youtube" data-youtube-id="${videoId}" aria-label="Odtwórz film z YouTube"><img src="/.netlify/images?url=https%3A%2F%2Fi.ytimg.com%2Fvi%2F${videoId}%2Fhqdefault.jpg&amp;w=480&amp;q=70&amp;fm=webp" alt="" loading="lazy" decoding="async" width="480" height="360"><span class="lite-youtube__play" aria-hidden="true"></span><span class="lite-youtube__label">Odtwórz film</span></button>`,
    );

    return withoutYouTubeIframes.replace(
      /<iframe\b[^>]*\bsrc=["']([^"']*streamable\.com[^"']*)["'][^>]*>(?:\s*<\/iframe>)?/gi,
      (_iframe, rawSource: string) => {
        const source = rawSource.replace(/&amp;/g, '&');

        try {
          const url = new URL(source);
          if (url.protocol !== 'https:' || !/(^|\.)streamable\.com$/i.test(url.hostname)) {
            return _iframe;
          }

          const safeSource = url.toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;');
          return `<button type="button" class="article-embed-placeholder" data-embed-src="${safeSource}" aria-label="Odtwórz osadzone wideo"><span aria-hidden="true">▶</span><strong>Odtwórz wideo</strong><small>Materiał zostanie załadowany ze Streamable</small></button>`;
        } catch {
          return _iframe;
        }
      },
    );
  }

  private removeTwitterScripts(html: string): string {
    return html.replace(
      /<script\b[^>]*\bsrc=["']https?:\/\/(?:platform\.)?(?:twitter|x)\.com\/widgets\.js[^"']*["'][^>]*>\s*<\/script>/gi,
      '',
    );
  }

  private renderTwitterEmbeds(attempt = 0): void {
    const content = this.elementRef.nativeElement.querySelector<HTMLElement>(
      '.article-detail__content',
    );
    if (!content?.querySelector('blockquote.twitter-tweet')) return;

    const view = this.document.defaultView as TwitterWindow | null;
    if (!view) return;

    if (view.twttr?.widgets?.load) {
      void view.twttr.widgets.load(content);
      return;
    }

    let script = this.document.querySelector<HTMLScriptElement>('#twitter-widgets-script');
    if (!script) {
      script = this.document.createElement('script');
      script.id = 'twitter-widgets-script';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      this.document.head.appendChild(script);
    }

    if (attempt >= 5) return;
    const timeout = view.setTimeout(() => this.renderTwitterEmbeds(attempt + 1), 500);
    this.destroyRef.onDestroy(() => view.clearTimeout(timeout));
  }

  private removeDuplicateLeadingImage(content: string, heroImageUrl: string): string {
    const leadingMedia = content.match(
      /^\s*(?:<figure\b[^>]*>[\s\S]*?<\/figure>|<p\b[^>]*>\s*<img\b[^>]*>\s*<\/p>|<img\b[^>]*>)/i,
    );

    if (!leadingMedia) return content;

    const source = leadingMedia[0].match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
    if (!source || !this.sameImage(source, heroImageUrl)) return content;

    return content.slice(leadingMedia[0].length).trimStart();
  }

  private sameImage(firstUrl: string, secondUrl: string): boolean {
    const normalizePath = (value: string) =>
      value
        .toLowerCase()
        .replace(/-\d+x\d+(?=\.[a-z0-9]+$)/, '')
        .replace(/\/$/, '');

    const unwrapProxyUrl = (value: string): string => {
      const decoded = value.replace(/&amp;/g, '&');

      try {
        const url = new URL(decoded, 'https://szostygracz.local');
        const proxiedUrl = url.searchParams.get('url');

        if (proxiedUrl) {
          return proxiedUrl;
        }

        return decoded;
      } catch {
        return decoded;
      }
    };

    const normalize = (value: string) => {
      const unwrapped = unwrapProxyUrl(value);

      try {
        const url = new URL(unwrapped, 'https://szostygracz.local');
        return normalizePath(`${url.hostname}${url.pathname}`);
      } catch {
        return normalizePath(unwrapped.split(/[?#]/, 1)[0]);
      }
    };

    return normalize(firstUrl) === normalize(secondUrl);
  }
}
