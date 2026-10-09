import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { matchCrudRoute } from '@smartsoft001/crud-shell-react';
import { useNavigation } from '@smartsoft001/react';

import { AuthGuard } from './auth/auth.guard';
import { LoginPage } from './auth/login.page';
import { NOTES_PATH, NotesFeature } from './notes/notes.feature';

/** The URL of the provider's navigation adapter, re-rendering after every navigation. */
export function useCurrentUrl(): string {
  const navigation = useNavigation();
  const subscribe = useCallback(
    (onChange: () => void) => navigation.subscribe(onChange),
    [navigation],
  );

  return useSyncExternalStore(subscribe, () => navigation.getCurrentUrl());
}

/** Replaces the current URL with `to`, the way a router's redirect does. */
function Redirect({ to }: { to: string }) {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.navigate(to, { replace: true });
  }, [navigation, to]);

  return null;
}

/**
 * The application's routes without a router: the URL of the navigation
 * adapter picks the page. /login is the login page, the pages of the notes
 * feature (/notes, /notes/add and /notes/:id, matched the way `SmartCrudPages`
 * matches them) sit behind the guard, and every other URL goes to /notes.
 */
export function AppRoutes() {
  const url = useCurrentUrl();

  if (url.split(/[?#]/)[0] === '/login') return <LoginPage />;

  if (matchCrudRoute(url, NOTES_PATH)) {
    return (
      <AuthGuard>
        <NotesFeature />
      </AuthGuard>
    );
  }

  return <Redirect to={NOTES_PATH} />;
}
