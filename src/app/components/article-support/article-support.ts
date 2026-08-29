import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PwaInstallService } from '../../services/pwa-install';

@Component({
  selector: 'app-article-support',
  templateUrl: './article-support.html',
  styleUrl: './article-support.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleSupport {
  readonly pwa = inject(PwaInstallService);
  readonly amounts = [
    { amount: '15 zł', url: 'https://ssl.dotpay.pl/t2/?pid=p24:ce2495f2a458a69aeb4ac7756d0b' },
    { amount: '30 zł', url: 'https://ssl.dotpay.pl/t2/?pid=p24:ba08584037f3f57fd4c7f19aea63' },
    { amount: '75 zł', url: 'https://ssl.dotpay.pl/t2/?pid=p24:b2727e47ac3d783fe0c8ad722cdd' },
    { amount: '250 zł', url: 'https://ssl.dotpay.pl/t2/?pid=p24:f1a19958828cacb1f0bc0b50572d' },
  ] as const;
}
