import { useMemo } from 'react';

import {
  AuthService,
  IAuthToken,
  SmartHttpClient,
  SmartHttpError,
  useAuthService,
  useHttpClient,
} from '@smartsoft001/react';

/** Client registered in the API's `tokenConfig.clients`. */
export const AUTH_CLIENT_ID = 'example-app';
export const TOKEN_URL = '/api/token';

interface ITokenResponse extends IAuthToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expired_in: number;
  username: string;
}

export class LoginService {
  constructor(
    private readonly http: SmartHttpClient,
    private readonly authService: AuthService,
  ) {}

  /**
   * Runs the OAuth password grant against the API and stores the returned token.
   * Rejects with the API's `details` message (or a generic one) on failure.
   */
  async signIn(username: string, password: string): Promise<void> {
    try {
      const token = await this.http.post<ITokenResponse>(TOKEN_URL, {
        grant_type: 'password',
        username,
        password,
        client_id: AUTH_CLIENT_ID,
      });

      this.authService.setToken(token);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  signOut(): void {
    this.authService.removeToken();
  }
}

/** The service over the HTTP client and the `AuthService` of `SmartProvider`. */
export function useLoginService(): LoginService {
  const http = useHttpClient();
  const authService = useAuthService();

  return useMemo(
    () => new LoginService(http, authService),
    [http, authService],
  );
}

function getErrorMessage(error: unknown): string {
  const details = error instanceof SmartHttpError ? error.body?.details : null;

  return typeof details === 'string' ? details : 'Sign-in failed';
}
