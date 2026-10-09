import { SmartConfig } from '@smartsoft001/react';

/**
 * Nothing: `SmartProvider` creates its own HTTP client, which talks to the
 * real API. The `demo` build replaces this file with
 * `in-memory-api.providers.demo.ts`, which hands it a client over the
 * in-memory double, so the double never ships in the development or the
 * production build.
 */
export const IN_MEMORY_API_PROVIDERS: Pick<
  SmartConfig,
  'authService' | 'http'
> = {};
