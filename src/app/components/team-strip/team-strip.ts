import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { TeamFilter } from '../../models/ui';

@Component({
  selector: 'app-team-strip',
  imports: [MatButtonModule],
  templateUrl: './team-strip.html',
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamStrip {
  readonly teams = input.required<readonly TeamFilter[]>();
  readonly selectedTeam = input<TeamFilter | null>(null);
  readonly allFeedSelected = input(false);

  readonly teamSelected = output<TeamFilter>();
  readonly filterCleared = output<void>();
}
