import { createHistoryNavigation, ISmartNavigation } from '@smartsoft001/react';

/**
 * The navigation of the development and production builds: the route is the
 * path of the URL, as `SmartProvider` would do without one. The `demo` build
 * replaces this file with `navigation.demo.ts`.
 */
export const NAVIGATION: ISmartNavigation = createHistoryNavigation();
