import { ISmartLinkProps, ISmartNavigation } from '@smartsoft001/react';

/** An internal link of the hash navigation: `/notes` is `#/notes`. */
function HashLink({ href, ...props }: ISmartLinkProps) {
  return <a href={`#${href}`} {...props} />;
}

/**
 * Navigation in the hash of the URL (`/demo-react/#/notes/add`), for a host
 * that serves files only: whatever the route, the browser asks for the same
 * index.html. The counterpart of `createHistoryNavigation()` from
 * `@smartsoft001/react`, which keeps the route in the path.
 */
export function createHashNavigation(): ISmartNavigation {
  const listeners = new Set<(url: string) => void>();
  const current = () => window.location.hash.slice(1) || '/';
  const emit = () => {
    const url = current();

    for (const listener of [...listeners]) listener(url);
  };

  // A typed hash, a hash link and back/forward between entries.
  window.addEventListener('hashchange', emit);

  return {
    navigate(url, options) {
      // Unlike assigning `location.hash`, the history API fires no
      // `hashchange`, so the listeners hear about it once, from here.
      if (options?.replace) window.history.replaceState(null, '', `#${url}`);
      else window.history.pushState(null, '', `#${url}`);

      emit();
    },
    back() {
      window.history.back();
    },
    getCurrentUrl: current,
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    linkComponent: HashLink,
  };
}
