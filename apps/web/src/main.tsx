// Before any `@Model` class is evaluated: the decorators store their metadata
// with `Reflect`.
import 'reflect-metadata';
// The framework's stylesheets (Tailwind utilities with the `smart:` prefix),
// then the app's own.
import '@smartsoft001/react/styles.css';
import '@smartsoft001/crud-shell-react/styles.css';
import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/app';
import { AppProviders } from './app/app.providers';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
