import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

interface OneSignalApi {
  init(options: Record<string, unknown>): Promise<void>;
  Slidedown?: { promptPush(): Promise<void> };
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalApi) => void | Promise<void>>;
  }
}

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const appId = this.document
      .querySelector<HTMLMetaElement>('meta[name="onesignal-app-id"]')
      ?.content.trim();
    if (!appId) return;

    this.loadSdk(appId);
  }

  private loadSdk(appId: string): void {
    const view = this.document.defaultView;
    if (!view) return;

    view.OneSignalDeferred = view.OneSignalDeferred ?? [];
    view.OneSignalDeferred.push(async (oneSignal) => {
      await oneSignal.init({
        appId,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
        notifyButton: { enable: false },
      });

      view.setTimeout(() => void oneSignal.Slidedown?.promptPush(), 15_000);
    });

    if (this.document.querySelector('script[data-onesignal-sdk]')) return;
    const script = this.document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    script.dataset['onesignalSdk'] = 'true';
    this.document.head.append(script);
  }
}
