/**
 * @jest-environment node
 */
import { SmartHttpError } from '@smartsoft001/react';

import { IN_MEMORY_API_PROVIDERS } from './in-memory-api.providers';
import { IN_MEMORY_API_PROVIDERS as DEMO_PROVIDERS } from './in-memory-api.providers.demo';
import { AUTH_CLIENT_ID, TOKEN_URL } from '../auth/login.service';
import { notesConfig } from '../notes/notes.config';

describe('web: IN_MEMORY_API_PROVIDERS', () => {
  let network: jest.SpyInstance;

  beforeEach(() => {
    network = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('the request reached the network'));
  });

  afterEach(() => network.mockRestore());

  it('should leave the HTTP client of SmartProvider alone outside the demo build', () => {
    // Assert
    expect(IN_MEMORY_API_PROVIDERS).toEqual({});
  });

  it('should answer the token endpoint from the double in the demo build', async () => {
    // Act
    const token = await DEMO_PROVIDERS.http?.post<{ token_type: string }>(
      TOKEN_URL,
      {
        grant_type: 'password',
        username: 'admin@example.com',
        password: 'change-me',
        client_id: AUTH_CLIENT_ID,
      },
    );

    // Assert
    expect(token?.token_type).toBe('bearer');
    expect(network).not.toHaveBeenCalled();
  });

  it('should send the notes requests to the double, which checks the token', async () => {
    // Act
    const error = await DEMO_PROVIDERS.http
      ?.get(notesConfig.apiUrl)
      .catch((failure: SmartHttpError) => failure);

    // Assert: no token in the storage, so the double forbids the read.
    expect(error).toBeInstanceOf(SmartHttpError);
    expect((error as SmartHttpError).status).toBe(403);
    expect(network).not.toHaveBeenCalled();
  });

  it('should give SmartProvider the AuthService the client reads the token from', () => {
    // Assert
    expect(DEMO_PROVIDERS.authService).toBeDefined();
    expect(DEMO_PROVIDERS.authService?.getAccessToken()).toBeNull();
  });
});
