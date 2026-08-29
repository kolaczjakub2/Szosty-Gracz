import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export type AnalyticsConsent = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = 'G-V4ECGLFZ83';
const CONSENT_STORAGE_KEY = 'szostygracz-analytics-consent';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private scriptLoading?: Promise<void>;
  private initialized = false;

  readonly consent = signal<AnalyticsConsent | null>(null);
  readonly preferencesOpen = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const savedConsent = this.readConsent();
    this.consent.set(savedConsent);
    if (savedConsent === 'granted') void this.enableAnalytics();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (this.initialized && this.consent() === 'granted') {
          this.trackPageView(event.urlAfterRedirects);
        }
      });
  }

  openPreferences(): void {
    this.preferencesOpen.set(true);
  }

  accept(): void {
    this.saveConsent('granted');
    this.preferencesOpen.set(false);
    void this.enableAnalytics();
  }

  reject(): void {
    this.saveConsent('denied');
    this.preferencesOpen.set(false);
    this.disableAnalytics();
  }

  private async enableAnalytics(): Promise<void> {
    try {
      await this.loadGoogleTag();
    } catch {
      this.initialized = false;
      return;
    }
    const view = this.document.defaultView;
    if (!view) return;

    view.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    view.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    view.gtag('js', new Date());
    view.gtag('config', MEASUREMENT_ID, {
      send_page_view: false,
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    this.initialized = true;
    this.trackPageView(this.router.url);
  }

  private disableAnalytics(): void {
    const view = this.document.defaultView;
    if (view?.gtag) {
      view.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }
    this.deleteAnalyticsCookies();
  }

  private trackPageView(path: string): void {
    const view = this.document.defaultView;
    if (!view?.gtag) return;

    view.gtag('event', 'page_view', {
      page_location: view.location.href,
      page_path: path,
      page_title: this.document.title,
    });
  }

  private loadGoogleTag(): Promise<void> {
    if (this.scriptLoading) return this.scriptLoading;

    this.scriptLoading = new Promise((resolve, reject) => {
      const view = this.document.defaultView;
      if (!view) {
        resolve();
        return;
      }

      view.dataLayer = view.dataLayer || [];
      view.gtag = view.gtag || ((...args: unknown[]) => view.dataLayer.push(args));

      const existing = this.document.querySelector<HTMLScriptElement>(
        `script[data-google-analytics="${MEASUREMENT_ID}"]`,
      );
      if (existing) {
        resolve();
        return;
      }

      const script = this.document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      script.dataset['googleAnalytics'] = MEASUREMENT_ID;
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(new Error('Google Analytics failed to load')), {
        once: true,
      });
      this.document.head.appendChild(script);
    });

    return this.scriptLoading;
  }

  private readConsent(): AnalyticsConsent | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(CONSENT_STORAGE_KEY);
      return value === 'granted' || value === 'denied' ? value : null;
    } catch {
      return null;
    }
  }

  private saveConsent(value: AnalyticsConsent): void {
    this.consent.set(value);
    try {
      this.document.defaultView?.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {
      // The current choice still applies for this page when storage is unavailable.
    }
  }

  private deleteAnalyticsCookies(): void {
    const hostname = this.document.location.hostname;
    const domainParts = hostname.split('.');
    const domains = ['', hostname, `.${hostname}`];
    if (domainParts.length > 1) domains.push(`.${domainParts.slice(-2).join('.')}`);

    for (const cookie of this.document.cookie.split(';')) {
      const name = cookie.split('=')[0]?.trim();
      if (!name || !/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of domains) {
        this.document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ''}`;
      }
    }
  }
}
