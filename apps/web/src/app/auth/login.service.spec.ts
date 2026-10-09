/**
 * @jest-environment node
 */
import {
  AuthService,
  SmartHttpClient,
  StorageService,
} from '@smartsoft001/react';

import { AUTH_CLIENT_ID, LoginService, TOKEN_URL } from './login.service';

describe('web: LoginService', () => {
  const username = 'admin@example.com';
  const password = 'placeholder-password';
  const tokenResponse = {
    access_token: 'placeholder-access-token',
    refresh_token: 'placeholder-refresh-token',
    token_type: 'bearer',
    expired_in: 3600,
    username,
  };

  let fetch: jest.Mock<Promise<Response>, [string, RequestInit]>;
  let authService: AuthService;
  let service: LoginService;

  const respond = (body: unknown, status = 200) =>
    fetch.mockResolvedValueOnce(
      new Response(body === '' ? '' : JSON.stringify(body), { status }),
    );

  beforeEach(() => {
    fetch = jest.fn();
    authService = new AuthService(new StorageService(null));
    service = new LoginService(
      new SmartHttpClient({
        fetch: fetch as unknown as typeof globalThis.fetch,
      }),
      authService,
    );
  });

  it('should post the password grant to the token endpoint', async () => {
    // Arrange
    respond(tokenResponse);

    // Act
    const result = service.signIn(username, password);

    // Assert
    await expect(result).resolves.toBeUndefined();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(TOKEN_URL);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      grant_type: 'password',
      username,
      password,
      client_id: AUTH_CLIENT_ID,
    });
  });

  it('should store the returned token', async () => {
    // Arrange
    const setToken = jest.spyOn(authService, 'setToken');
    respond(tokenResponse);

    // Act
    await service.signIn(username, password);

    // Assert
    expect(setToken).toHaveBeenCalledWith(tokenResponse);
  });

  it('should reject with the API message when the credentials are invalid', async () => {
    // Arrange
    respond({ details: 'Invalid username or password' }, 400);

    // Act
    const result = service.signIn(username, password);

    // Assert
    await expect(result).rejects.toThrow('Invalid username or password');
  });

  it('should reject with a generic message for other errors', async () => {
    // Arrange
    respond('', 500);

    // Act
    const result = service.signIn(username, password);

    // Assert
    await expect(result).rejects.toThrow('Sign-in failed');
  });

  it('should reject with a generic message when the API cannot be reached', async () => {
    // Arrange
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    // Act
    const result = service.signIn(username, password);

    // Assert
    await expect(result).rejects.toThrow('Sign-in failed');
  });

  it('should remove the token on sign out', () => {
    // Arrange
    const removeToken = jest.spyOn(authService, 'removeToken');

    // Act
    service.signOut();

    // Assert
    expect(removeToken).toHaveBeenCalled();
  });
});
