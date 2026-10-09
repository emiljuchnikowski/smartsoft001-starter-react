import { useState } from 'react';

import {
  ISignInFormOptions,
  ISignInFormSubmit,
  SmartSignInForm,
  useNavigation,
} from '@smartsoft001/react';

import { useLoginService } from './login.service';

/** The seeded user name is an email, so the form's email input fits. */
const options: ISignInFormOptions = {
  showLabels: true,
  submitLabel: 'Sign in',
  emailPlaceholder: 'admin@example.com',
};

export function LoginPage() {
  const loginService = useLoginService();
  const navigation = useNavigation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async ({ email, password }: ISignInFormSubmit) => {
    setPending(true);
    setError(null);

    try {
      await loginService.signIn(email, password);
      navigation.navigate('/notes');
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="app-login">
      <h1>Sign in</h1>
      <SmartSignInForm
        disabled={pending}
        options={options}
        onSubmit={onSubmit}
      />
      {error && (
        <p role="alert" className="app-login__error">
          {error}
        </p>
      )}
    </div>
  );
}
