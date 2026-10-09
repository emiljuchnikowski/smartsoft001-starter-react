import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ISmartNavigation, SmartProvider } from '@smartsoft001/react';

import { LoginPage } from './login.page';

const mockSignIn = jest.fn();

jest.mock('./login.service', () => ({
  useLoginService: () => ({ signIn: mockSignIn }),
}));

describe('web: LoginPage', () => {
  const username = 'admin@example.com';
  const password = 'placeholder-password';

  let navigate: jest.Mock;

  const renderPage = () => {
    const navigation: ISmartNavigation = {
      navigate,
      back: jest.fn(),
      getCurrentUrl: () => '/login',
      subscribe: () => () => undefined,
    };

    return render(
      <SmartProvider language="eng" navigation={navigation}>
        <LoginPage />
      </SmartProvider>,
    );
  };

  const submitCredentials = async (container: HTMLElement) => {
    const user = userEvent.setup();

    await user.type(
      container.querySelector('#smart-sign-in-form-email') as HTMLElement,
      username,
    );
    await user.type(
      container.querySelector('#smart-sign-in-form-password') as HTMLElement,
      password,
    );
    await user.click(container.querySelector('button.submit') as HTMLElement);
  };

  beforeEach(() => {
    mockSignIn.mockReset();
    navigate = jest.fn();
  });

  it('should render the sign-in form', () => {
    // Act
    const { container } = renderPage();

    // Assert
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Sign in',
    );
    expect(container.querySelector('button.submit')).toHaveTextContent(
      'Sign in',
    );
    expect(
      container.querySelector('#smart-sign-in-form-email'),
    ).toHaveAttribute('placeholder', 'admin@example.com');
  });

  it('should navigate to the notes page after a successful sign in', async () => {
    // Arrange
    mockSignIn.mockResolvedValue(undefined);
    const { container } = renderPage();

    // Act
    await submitCredentials(container);

    // Assert
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/notes'));
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith(username, password);
  });

  it('should render an alert when the sign in fails', async () => {
    // Arrange
    mockSignIn.mockRejectedValue(new Error('Invalid username or password'));
    const { container } = renderPage();

    // Act
    await submitCredentials(container);

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid username or password',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should disable the form while the sign in is pending', async () => {
    // Arrange
    mockSignIn.mockReturnValue(new Promise(() => undefined));
    const { container } = renderPage();

    // Act
    await submitCredentials(container);

    // Assert
    expect(container.querySelector('button.submit')).toBeDisabled();
    expect(container.querySelector('#smart-sign-in-form-email')).toBeDisabled();
  });
});
