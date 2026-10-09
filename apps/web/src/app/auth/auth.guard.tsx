import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useAuthService, useNavigation } from '@smartsoft001/react';

/** Lets authenticated users through and sends everybody else to the login page. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const authenticated = useAuthService().isAuthenticated();
  const navigation = useNavigation();

  useEffect(() => {
    if (!authenticated) navigation.navigate('/login', { replace: true });
  }, [authenticated, navigation]);

  return authenticated ? children : null;
}
