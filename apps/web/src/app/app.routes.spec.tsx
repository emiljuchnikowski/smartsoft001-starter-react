import { render, screen, waitFor } from '@testing-library/react';

import {
  AuthService,
  createHistoryNavigation,
  SmartProvider,
} from '@smartsoft001/react';

import { AppRoutes } from './app.routes';

jest.mock('./notes/notes.feature', () => ({
  NOTES_PATH: '/notes',
  NotesFeature: () => 'the notes feature',
}));

/**
 * The routes over the default navigation of the development build, the
 * browser history (jsdom's), so a redirect shows up in `window.location`.
 */
describe('web: AppRoutes', () => {
  const renderAt = (url: string, authenticated: boolean) => {
    window.history.replaceState(null, '', url);
    const authService = {
      isAuthenticated: () => authenticated,
      getAccessToken: () => null,
    } as unknown as AuthService;

    render(
      <SmartProvider
        language="eng"
        authService={authService}
        navigation={createHistoryNavigation()}
      >
        <AppRoutes />
      </SmartProvider>,
    );
  };

  it('should render the login page on /login', () => {
    // Act
    renderAt('/login', false);

    // Assert
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Sign in',
    );
  });

  it.each([
    '/notes',
    '/notes/add',
    '/notes/000000000000000000000001',
    '/notes/1?edit=1',
  ])(
    'should render the notes feature on %s for an authenticated user',
    (url) => {
      // Act
      renderAt(url, true);

      // Assert
      expect(screen.getByText('the notes feature')).toBeInTheDocument();
      expect(window.location.pathname + window.location.search).toBe(url);
    },
  );

  it('should send an anonymous visitor from /notes to the login page', async () => {
    // Act
    renderAt('/notes', false);

    // Assert
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Sign in',
    );
    expect(screen.queryByText('the notes feature')).not.toBeInTheDocument();
  });

  it.each(['/', '/elsewhere', '/notes/1/more'])(
    'should send %s to the notes',
    async (url) => {
      // Act
      renderAt(url, true);

      // Assert
      await waitFor(() => expect(window.location.pathname).toBe('/notes'));
      expect(screen.getByText('the notes feature')).toBeInTheDocument();
    },
  );

  it('should replace the history entry on a redirect', async () => {
    // Arrange
    const entries = window.history.length;

    // Act
    renderAt('/elsewhere', true);

    // Assert
    await waitFor(() => expect(window.location.pathname).toBe('/notes'));
    expect(window.history.length).toBe(entries);
  });
});
