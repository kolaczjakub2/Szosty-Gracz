import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Article } from '../../models/wordpress';
import { optimizedImageUrl } from '../../utils/image-url';

@Component({
  selector: 'app-story-deck',
  imports: [DatePipe],
  templateUrl: './story-deck.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryDeck {
  readonly optimizedImageUrl = optimizedImageUrl;
  readonly articles = input.required<readonly Article[]>();
  readonly activeIndex = input.required<number>();
  readonly slideSelected = output<number>();

  isActiveSlide(index: number): boolean {
    return index === this.activeIndex();
  }

  slideLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }
}
