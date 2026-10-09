import { ISmartNavigation } from '@smartsoft001/react';

import { createHashNavigation } from './hash-navigation';

/**
 * The `demo` build's replacement of `navigation.ts`. GitHub Pages serves
 * files only and its 404 page belongs to the documentation, so a deep link
 * like /demo-react/notes/add has nothing to fall back to; with the route in
 * the hash, every address of the demo is /demo-react/index.html.
 */
export const NAVIGATION: ISmartNavigation = createHashNavigation();
