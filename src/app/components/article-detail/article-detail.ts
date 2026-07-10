import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ArticleDetailViewModel, ArticleTag, ArticleTerm } from '../../models/wordpress';

@Component({
  selector: 'app-article-detail',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './article-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleDetail {
  readonly viewModel = input.required<ArticleDetailViewModel>();
  readonly closed = output<void>();
  readonly tagSelected = output<ArticleTag>();
  readonly termSelected = output<ArticleTerm>();
}
