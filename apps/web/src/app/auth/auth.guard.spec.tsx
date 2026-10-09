import { render, screen } from '@testing-library/react';

import {
  AuthService,
  ISmartNavigation,
  SmartProvider,
} from '@smartsoft001/react';

import { AuthGuard } from './auth.guard';

describe('web: AuthGuard', () => {
  let navigate: jest.Mock;

  const renderGuard = (authenticated: boolean) => {
    const authService = {
      isAuthenticated: () => authenticated,
      getAccessToken: () => null,
    } as unknown as AuthService;
    const navigation: ISmartNavigation = {
      navigate,
      back: jest.fn(),
      getCurrentUrl: () => '/notes',
      subscribe: () => () => undefined,
    };

    render(
      <SmartProvider authService={authService} navigation={navigation}>
        <AuthGuard>
          <p>the notes</p>
        </AuthGuard>
      </SmartProvider>,
    );
  };

  beforeEach(() => {
    navigate = jest.fn();
  });

  it('should render the page when the user is authenticated', () => {
    // Act
    renderGuard(true);

    // Assert
    expect(screen.getByText('the notes')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should redirect to the login page when the user is not authenticated', () => {
    // Act
    renderGuard(false);

    // Assert
    expect(screen.queryByText('the notes')).not.toBeInTheDocument();
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
