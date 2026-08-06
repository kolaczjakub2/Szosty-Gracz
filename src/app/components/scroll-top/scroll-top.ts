import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-scroll-top',
  templateUrl: './scroll-top.html',
  styleUrl: './scroll-top.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollTop {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  readonly visible = signal(false);
  readonly progress = signal(0);

  constructor() {
    afterNextRender(() => {
      const view = this.document.defaultView;

      if (!view) {
        return;
      }

      let frameId: number | null = null;

      const update = () => {
        const pageHeight = this.document.documentElement.scrollHeight - view.innerHeight;
        const scrollPosition = Math.max(view.scrollY, 0);

        this.visible.set(scrollPosition > 420);
        this.progress.set(pageHeight > 0 ? Math.min((scrollPosition / pageHeight) * 100, 100) : 0);
        frameId = null;
      };

      const handleScroll = () => {
        if (frameId === null) {
          frameId = view.requestAnimationFrame(update);
        }
      };

      view.addEventListener('scroll', handleScroll, { passive: true });

      this.destroyRef.onDestroy(() => {
        view.removeEventListener('scroll', handleScroll);

        if (frameId !== null) {
          view.cancelAnimationFrame(frameId);
        }
      });
    });
  }

  scrollToTop(): void {
    const view = this.document.defaultView;

    if (!view) {
      return;
    }

    const reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    view.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}
