import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ArticleDetailViewModel, ArticleTag, ArticleTerm } from '../../models/wordpress';
import { ArticleBody } from '../article-body/article-body';
import { ArticleComments } from '../article-comments/article-comments';

@Component({
  selector: 'app-article-detail',
  imports: [ArticleBody, ArticleComments, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './article-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleDetail {
  readonly viewModel = input.required<ArticleDetailViewModel>();
  readonly closed = output<void>();
  readonly tagSelected = output<ArticleTag>();
  readonly termSelected = output<ArticleTerm>();
}
