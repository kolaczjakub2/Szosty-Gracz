import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiIcon } from '../ui-icon/ui-icon';

interface SupportAmount {
  readonly amount: string;
  readonly label: string;
  readonly url: string;
  readonly featured?: boolean;
}

@Component({
  selector: 'app-support-page',
  imports: [RouterLink, UiIcon],
  templateUrl: './support-page.html',
  styleUrl: './support-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportPage {
  readonly amounts: readonly SupportAmount[] = [
    { amount: '15 zł', label: 'Dobra kawa dla redakcji', url: 'https://ssl.dotpay.pl/t2/?pid=p24:ce2495f2a458a69aeb4ac7756d0b' },
    { amount: '30 zł', label: 'Wspieram regularną grę', url: 'https://ssl.dotpay.pl/t2/?pid=p24:ba08584037f3f57fd4c7f19aea63', featured: true },
    { amount: '75 zł', label: 'Gram z 6G w pierwszej piątce', url: 'https://ssl.dotpay.pl/t2/?pid=p24:b2727e47ac3d783fe0c8ad722cdd' },
    { amount: '250 zł', label: 'Mocne wsparcie projektu', url: 'https://ssl.dotpay.pl/t2/?pid=p24:f1a19958828cacb1f0bc0b50572d' },
    { amount: '500 zł', label: 'Mecenas Szóstego Gracza', url: 'https://ssl.dotpay.pl/t2/?pid=p24:bea33e8f468f510dd3e8567aed61' },
  ];
}
