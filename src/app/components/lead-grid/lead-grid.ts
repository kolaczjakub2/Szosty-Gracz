import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  afterNextRender,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

import { Article } from '../../models/wordpress';
import { uniqueArticles } from '../../utils/article-collections';
import { LeadCarousel } from '../lead-carousel/lead-carousel';
import { StoryDeck } from '../story-deck/story-deck';

@Component({
  selector: 'app-lead-grid',
  imports: [LeadCarousel, StoryDeck],
  templateUrl: './lead-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadGrid implements OnDestroy {
  readonly hero = input.required<Article>();
  readonly sideArticles = input.required<readonly Article[]>();
  readonly articleOpened = output<Article>();
  readonly activeIndex = signal(0);
  readonly featureArticles = computed(() =>
    uniqueArticles([this.hero(), ...this.sideArticles()]).slice(0, 4),
  );
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
  readonly currentSlideLabel = computed(() => this.slideLabel(this.normalizedIndex()));
  readonly totalSlideLabel = computed(() => this.slideLabel(this.featureArticles().length - 1));
  private autoplayId: number | undefined;
  private initialAutoplayId: number | undefined;

  constructor() {
    afterNextRender(() => {
      this.initialAutoplayId = window.setTimeout(() => {
        this.initialAutoplayId = undefined;
        this.nextSlide(false);
        this.autoplayId = this.startAutoplay();
      }, 12_000);
    });
  }

  ngOnDestroy(): void {
    if (this.initialAutoplayId !== undefined) window.clearTimeout(this.initialAutoplayId);
    if (this.autoplayId !== undefined) window.clearInterval(this.autoplayId);
  }

  openStory(index: number): void {
    const article = this.featureArticles()[index];

    if (article) this.articleOpened.emit(article);
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
    this.clearInitialAutoplay();
    if (this.autoplayId !== undefined) window.clearInterval(this.autoplayId);
  }

  resumeAutoplay(): void {
    this.restartAutoplay();
  }

  private slideLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  private restartAutoplay(): void {
    this.clearInitialAutoplay();
    if (this.autoplayId !== undefined) window.clearInterval(this.autoplayId);
    this.autoplayId = this.startAutoplay();
  }

  private clearInitialAutoplay(): void {
    if (this.initialAutoplayId === undefined) return;
    window.clearTimeout(this.initialAutoplayId);
    this.initialAutoplayId = undefined;
  }

  private startAutoplay(): number | undefined {
    return window.setInterval(() => this.nextSlide(false), 8000);
  }
}
