import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Article } from '../../models/wordpress';
import { articlePath } from '../../utils/article-route';
import { optimizedImageUrl } from '../../utils/image-url';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-article-recommendations',
  imports: [DatePipe, UiIcon],
  templateUrl: './article-recommendations.html',
  styleUrl: './article-recommendations.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleRecommendations {
  readonly articlePath = articlePath;
  readonly optimizedImageUrl = optimizedImageUrl;
  readonly relatedArticles = input.required<readonly Article[]>();
  readonly authorArticles = input.required<readonly Article[]>();
  readonly authorName = input.required<string>();
  readonly articleOpened = output<Article>();
}
