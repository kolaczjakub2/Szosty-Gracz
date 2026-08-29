import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TeamFilter } from '../../models/ui';
import { optimizedImageUrl } from '../../utils/image-url';

@Component({
  selector: 'app-team-strip',
  templateUrl: './team-strip.html',
  styleUrl: './team-strip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamStrip {
  readonly optimizedImageUrl = optimizedImageUrl;
  readonly teams = input.required<readonly TeamFilter[]>();
  readonly selectedTeam = input<TeamFilter | null>(null);
  readonly allFeedSelected = input(false);

  readonly teamSelected = output<TeamFilter>();
  readonly filterCleared = output<void>();
}
