import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-archive-pagination',
  imports: [MatButtonModule, MatIconModule],
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
