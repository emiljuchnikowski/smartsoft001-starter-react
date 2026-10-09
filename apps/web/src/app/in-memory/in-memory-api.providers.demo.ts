import {
  AuthService,
  createAuthInterceptor,
  SmartConfig,
  SmartHttpClient,
  StorageService,
} from '@smartsoft001/react';

import { createInMemoryApi } from './in-memory-api';

const authService = new AuthService(new StorageService());

/**
 * The `demo` build's replacement of `in-memory-api.providers.ts`: the HTTP
 * client of `SmartProvider` sends its requests to the in-memory double
 * instead of the network, with the bearer token added the way the default
 * client adds it.
 */
export const IN_MEMORY_API_PROVIDERS: Pick<
  SmartConfig,
  'authService' | 'http'
> = {
  authService,
  http: new SmartHttpClient({
    fetch: createInMemoryApi(),
    interceptors: [createAuthInterceptor(() => authService.getAccessToken())],
  }),
};
