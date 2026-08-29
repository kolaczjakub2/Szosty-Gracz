import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ARCHIVE_AUTHORS } from '../../data/archive-authors';

interface TeamMember {
  readonly initials: string;
  readonly name: string;
  readonly role: string;
  readonly imageUrl?: string;
  readonly imagePosition?: string;
  readonly profileUrl?: string;
}

@Component({
  selector: 'app-about-page',
  imports: [RouterLink],
  templateUrl: './about-page.html',
  styleUrl: './about-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage {
  readonly founders: readonly TeamMember[] = [
    {
      initials: 'MK',
      name: 'Maciej Kwiatkowski',
      role: 'Współtwórca portalu, ponad 20 lat z NBA',
      imageUrl: '/team-maciej-kwiatkowski.jpg',
      imagePosition: 'center 42%',
      profileUrl: 'https://twitter.com/mackwiatkowski',
    },
    {
      initials: 'AS',
      name: 'Adam Szczepański',
      role: 'Współtwórca portalu, ponad 20 lat z NBA',
      imageUrl: '/team-adam-szczepanski-avatar.jpg',
      imagePosition: 'center',
      profileUrl: 'https://twitter.com/aszczepanski',
    },
  ];

  readonly archiveAuthors = ARCHIVE_AUTHORS;
}
