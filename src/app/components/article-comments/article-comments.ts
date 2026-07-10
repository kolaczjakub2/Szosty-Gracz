import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { ArticleComment } from '../../models/wordpress';

@Component({
  selector: 'app-article-comments',
  imports: [DatePipe, MatIconModule],
  templateUrl: './article-comments.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleComments {
  readonly comments = input.required<readonly ArticleComment[]>();
  readonly commentCount = input.required<number>();
}
