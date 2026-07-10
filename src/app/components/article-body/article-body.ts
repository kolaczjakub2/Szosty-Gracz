import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ArticleDetail, ArticleTag, ArticleTerm } from '../../models/wordpress';
import { ArticleTags } from '../article-tags/article-tags';

@Component({
  selector: 'app-article-body',
  imports: [ArticleTags, DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './article-body.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleBody {
  readonly article = input.required<ArticleDetail>();
  readonly tagSelected = output<ArticleTag>();
  readonly termSelected = output<ArticleTerm>();
}
