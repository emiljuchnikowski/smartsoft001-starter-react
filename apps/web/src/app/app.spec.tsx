import { fireEvent, render, screen } from '@testing-library/react';

import {
  AuthService,
  ISmartNavigation,
  SmartProvider,
} from '@smartsoft001/react';

import { App } from './app';
import { createHashNavigation } from './hash-navigation';

const mockSignOut = jest.fn();

jest.mock('./auth/login.service', () => ({
  useLoginService: () => ({ signOut: mockSignOut }),
}));

jest.mock('./app.routes', () => ({
  ...jest.requireActual('./app.routes'),
  AppRoutes: () => null,
}));

describe('web: App', () => {
  let navigate: jest.Mock;

  const fakeNavigation = (): ISmartNavigation => ({
    navigate,
    back: jest.fn(),
    getCurrentUrl: () => '/notes',
    subscribe: () => () => undefined,
  });

  const renderApp = (
    authenticated: boolean,
    navigation: ISmartNavigation = fakeNavigation(),
  ) => {
    const authService = {
      isAuthenticated: () => authenticated,
      getAccessToken: () => null,
    } as unknown as AuthService;

    return render(
      <SmartProvider authService={authService} navigation={navigation}>
        <App />
      </SmartProvider>,
    );
  };

  beforeEach(() => {
    mockSignOut.mockReset();
    navigate = jest.fn();
  });

  it('should render the notes link', () => {
    // Act
    renderApp(false);

    // Assert
    const link = screen.getByRole('link', { name: 'Notes' });
    expect(link).toHaveAttribute('href', '/notes');
  });

  it('should open the notes without a page load on a click of the link', () => {
    // Arrange
    renderApp(false);

    // Act
    const notDefaultPrevented = fireEvent.click(
      screen.getByRole('link', { name: 'Notes' }),
    );

    // Assert
    expect(notDefaultPrevented).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/notes');
  });

  it('should link into the hash under the hash navigation of the demo', () => {
    // Act
    renderApp(false, createHashNavigation());

    // Assert
    expect(screen.getByRole('link', { name: 'Notes' })).toHaveAttribute(
      'href',
      '#/notes',
    );
  });

  it('should hide the sign out button when the user is not authenticated', () => {
    // Act
    const { container } = renderApp(false);

    // Assert
    expect(container.querySelector('.app-header__sign-out')).toBeNull();
  });

  it('should show the sign out button when the user is authenticated', () => {
    // Act
    const { container } = renderApp(true);

    // Assert
    expect(container.querySelector('.app-header__sign-out')).toHaveTextContent(
      'Sign out',
    );
  });

  it('should sign out and go to the login page on click', () => {
    // Arrange
    renderApp(true);

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    // Assert
    expect(mockSignOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
