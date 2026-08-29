import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Article, ArticleDetailViewModel, ArticleTag, ArticleTerm } from '../../models/wordpress';
import { ArticleBody } from '../article-body/article-body';
import { ArticleComments } from '../article-comments/article-comments';
import { ArticleRecommendations } from '../article-recommendations/article-recommendations';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-article-detail',
  imports: [ArticleBody, ArticleComments, ArticleRecommendations, UiIcon],
  templateUrl: './article-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleDetail {
  readonly viewModel = input.required<ArticleDetailViewModel>();
  readonly closed = output<void>();
  readonly tagSelected = output<ArticleTag>();
  readonly termSelected = output<ArticleTerm>();
  readonly articleOpened = output<Article>();
}
