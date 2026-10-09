import { render } from '@testing-library/react';

import { AUTH_TOKEN, SmartContextValue, useSmart } from '@smartsoft001/react';

import { AppProviders } from './app.providers';
import { NAVIGATION } from './navigation';

/** A JWT `AuthService` accepts: it decodes the payload and checks `exp`. */
function jwt(payload: Record<string, unknown>): string {
  const segment = (value: unknown) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  return [segment({ alg: 'HS256', typ: 'JWT' }), segment(payload), 'sig'].join(
    '.',
  );
}

describe('web: AppProviders', () => {
  const accessToken = jwt({
    permissions: ['admin'],
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  let smart: SmartContextValue;
  let fetch: jest.Mock;

  function Probe() {
    smart = useSmart();

    return null;
  }

  /** The `Authorization` header of the one request the client sent. */
  const authorization = () =>
    (fetch.mock.calls[0][1].headers as Record<string, string>)['Authorization'];

  beforeEach(() => {
    fetch = jest.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: async () => '[]',
        }) as unknown as Response,
    );
    globalThis.fetch = fetch;

    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
  });

  afterEach(() => {
    localStorage.clear();
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it('should add the bearer header to the API requests when a token is stored', async () => {
    // Arrange
    smart.authService.setToken({ access_token: accessToken });

    // Act
    await smart.http.get('/api/notes');

    // Assert
    expect(fetch.mock.calls[0][0]).toBe('/api/notes');
    expect(authorization()).toBe(`Bearer ${accessToken}`);
  });

  it('should send the request without the header when no token is stored', async () => {
    // Act
    await smart.http.get('/api/notes');

    // Assert
    expect(authorization()).toBeUndefined();
  });

  it('should keep the token in localStorage under AUTH_TOKEN', () => {
    // Arrange
    const token = { access_token: accessToken, token_type: 'bearer' };

    // Act
    smart.authService.setToken(token);

    // Assert
    expect(AUTH_TOKEN).toBe('AUTH_TOKEN');
    expect(JSON.parse(localStorage.getItem('AUTH_TOKEN') ?? 'null')).toEqual(
      token,
    );
    expect(smart.authService.isAuthenticated()).toBe(true);
  });

  it('should register the application labels over the framework strings', () => {
    // Act
    const { translate } = smart;

    // Assert
    expect(smart.language).toBe('eng');
    expect(translate('Notes')).toBe('Notes');
    expect(translate('MODEL.title')).toBe('Title');
    expect(translate('MODEL.content')).toBe('Content');
    expect(translate('remove')).toBe('remove');
    expect(translate('OBJECT.confirmDelete')).toBe('confirm delete object');
  });

  it('should navigate with the navigation of the build', () => {
    // Assert
    expect(smart.navigation).toBe(NAVIGATION);
  });
});
