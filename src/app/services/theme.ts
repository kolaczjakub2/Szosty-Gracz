import { DOCUMENT } from '@angular/common';
import { Injectable, afterNextRender, computed, inject, signal } from '@angular/core';

export type ColorTheme = 'dark' | 'light';

const STORAGE_KEY = 'szostygracz-color-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly activeTheme = signal<ColorTheme>('dark');

  readonly theme = this.activeTheme.asReadonly();
  readonly isDark = computed(() => this.activeTheme() === 'dark');
  readonly nextThemeLabel = computed(() =>
    this.isDark() ? 'Włącz jasny motyw' : 'Włącz ciemny motyw',
  );

  constructor() {
    afterNextRender(() => this.activeTheme.set(this.readDocumentTheme()));
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  private setTheme(theme: ColorTheme): void {
    const root = this.document.documentElement;

    this.activeTheme.set(theme);
    root.dataset['theme'] = theme;
    root.style.colorScheme = theme;
    this.document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#f0ebe4' : '#080909');

    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Motyw nadal działa, nawet jeśli przeglądarka blokuje pamięć lokalną.
    }
  }

  private readDocumentTheme(): ColorTheme {
    return this.document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
  }
}
