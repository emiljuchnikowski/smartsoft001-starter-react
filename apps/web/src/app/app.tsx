import type { ReactNode } from 'react';

import { useAuthService, useNavigation } from '@smartsoft001/react';

import { AppRoutes, useCurrentUrl } from './app.routes';
import { useLoginService } from './auth/login.service';
import { NOTES_PATH } from './notes/notes.feature';

/**
 * An internal link: the adapter's `linkComponent` when it has one (the hash
 * navigation of the demo), else an anchor that navigates without a reload.
 */
function AppLink({ href, children }: { href: string; children: ReactNode }) {
  const navigation = useNavigation();
  const Link = navigation.linkComponent;

  if (Link) return <Link href={href}>{children}</Link>;

  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        navigation.navigate(href);
      }}
    >
      {children}
    </a>
  );
}

/** The shell: a header with the sign-out button, and the page of the URL. */
export function App() {
  const navigation = useNavigation();
  const authService = useAuthService();
  const loginService = useLoginService();

  // Rendered again after every navigation, which is when the token can change.
  useCurrentUrl();
  const authenticated = authService.isAuthenticated();

  const signOut = () => {
    loginService.signOut();
    navigation.navigate('/login');
  };

  return (
    <>
      <header className="app-header">
        <AppLink href={NOTES_PATH}>Notes</AppLink>
        {authenticated && (
          <button
            type="button"
            className="app-header__sign-out"
            onClick={signOut}
          >
            Sign out
          </button>
        )}
      </header>
      <main>
        <AppRoutes />
      </main>
    </>
  );
}
