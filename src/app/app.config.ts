import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideClientHydration,
  withIncrementalHydration,
  withNoHttpTransferCache,
} from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(withFetch()),
    provideClientHydration(withIncrementalHydration(), withNoHttpTransferCache()),
    provideServiceWorker('OneSignalSDKWorker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
