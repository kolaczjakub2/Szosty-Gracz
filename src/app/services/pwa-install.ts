import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);

  readonly iosHelpOpen = signal(false);
  readonly floatingDismissed = signal(false);
  readonly installed = signal(false);
  readonly isIos = signal(false);
  readonly canInstall = computed(
    () => !this.installed() && (this.deferredPrompt() !== null || this.isIos()),
  );

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const view = this.document.defaultView;
    const navigator = view?.navigator;
    if (!view || !navigator) return;

    const iosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = view.matchMedia('(display-mode: standalone)').matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    this.isIos.set(iosDevice && !standalone);
    this.installed.set(standalone);

    view.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt.set(event as BeforeInstallPromptEvent);
    });
    view.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.deferredPrompt.set(null);
      this.iosHelpOpen.set(false);
    });
  }

  async requestInstall(): Promise<void> {
    if (this.isIos()) {
      this.iosHelpOpen.set(true);
      return;
    }

    const prompt = this.deferredPrompt();
    if (!prompt) return;

    await prompt.prompt();
    await prompt.userChoice;
    this.deferredPrompt.set(null);
  }

  closeIosHelp(): void {
    this.iosHelpOpen.set(false);
  }

  dismissFloating(): void {
    this.floatingDismissed.set(true);
  }
}
