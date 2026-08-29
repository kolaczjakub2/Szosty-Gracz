import { ChangeDetectionStrategy, Component } from '@angular/core';

import { UiIcon } from '../ui-icon/ui-icon';

@Component({
  selector: 'app-home-promos',
  imports: [UiIcon],
  templateUrl: './home-promos.html',
  styleUrl: '../home-feed/home-feed.scss',
  styles: [':host { display: block; grid-column: 1 / -1; min-width: 0; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePromos {}
