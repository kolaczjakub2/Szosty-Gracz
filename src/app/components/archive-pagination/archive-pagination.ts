import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-archive-pagination',
  imports: [UiIcon],
  templateUrl: './archive-pagination.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivePagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pages = input.required<readonly number[]>();
  readonly pageSelected = output<number>();
}
