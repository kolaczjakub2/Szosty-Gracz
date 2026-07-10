import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Article } from '../../models/wordpress';

@Component({
  selector: 'app-lead-grid',
  imports: [DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './lead-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadGrid implements OnDestroy {
  readonly hero = input.required<Article>();
  readonly sideArticles = input.required<readonly Article[]>();
  readonly articleOpened = output<Article>();
  readonly activeIndex = signal(0);
  readonly featureArticles = computed(() => [this.hero(), ...this.sideArticles()].slice(0, 4));
  readonly normalizedIndex = computed(() => {
    const lastIndex = Math.max(this.featureArticles().length - 1, 0);

    return Math.min(this.activeIndex(), lastIndex);
  });
  readonly activeArticle = computed(
    () => this.featureArticles()[this.normalizedIndex()] ?? this.hero(),
  );
  readonly progressPercent = computed(
    () => ((this.normalizedIndex() + 1) / this.featureArticles().length) * 100,
  );
  private autoplayId = window.setInterval(() => this.nextSlide(false), 6500);

  ngOnDestroy(): void {
    window.clearInterval(this.autoplayId);
  }

  selectSlide(index: number): void {
    this.activeIndex.set(index);
    this.restartAutoplay();
  }

  previousSlide(): void {
    const length = this.featureArticles().length;
    this.activeIndex.set((this.normalizedIndex() - 1 + length) % length);
    this.restartAutoplay();
  }

  nextSlide(restart = true): void {
    const length = this.featureArticles().length;
    this.activeIndex.set((this.normalizedIndex() + 1) % length);

    if (restart) {
      this.restartAutoplay();
    }
  }

  pauseAutoplay(): void {
    window.clearInterval(this.autoplayId);
  }

  resumeAutoplay(): void {
    this.restartAutoplay();
  }

  isActiveSlide(index: number): boolean {
    return index === this.normalizedIndex();
  }

  slideLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  private restartAutoplay(): void {
    window.clearInterval(this.autoplayId);
    this.autoplayId = window.setInterval(() => this.nextSlide(false), 6500);
  }
}
