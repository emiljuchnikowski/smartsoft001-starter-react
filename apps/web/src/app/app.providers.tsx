import type { ReactNode } from 'react';

import { SmartProvider } from '@smartsoft001/react';

import { IN_MEMORY_API_PROVIDERS } from './in-memory/in-memory-api.providers';
import { NAVIGATION } from './navigation';
import { APP_LANGUAGE, APP_TRANSLATIONS } from './translations';

/**
 * Everything the generated screens need at the root of the application is
 * one `SmartProvider`. Its default HTTP client adds the stored token to every
 * request as a bearer header, and its `AuthService` keeps that token in
 * localStorage under `AUTH_TOKEN`, where the end-to-end suite seeds it too.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SmartProvider
      // The framework's English strings, with the app's labels merged over them.
      language={APP_LANGUAGE}
      translations={APP_TRANSLATIONS[APP_LANGUAGE]}
      // The browser history; the `demo` build uses the hash instead, see
      // navigation.demo.ts.
      navigation={NAVIGATION}
      // Empty, except in the `demo` build, where the HTTP client talks to an
      // in-memory double of the API; see in-memory-api.providers.demo.ts.
      {...IN_MEMORY_API_PROVIDERS}
    >
      {children}
    </SmartProvider>
  );
}
