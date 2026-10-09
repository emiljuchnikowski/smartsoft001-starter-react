import { CrudProvider, SmartCrudPages } from '@smartsoft001/crud-shell-react';

import { notesConfig } from './notes.config';

/** The path the notes feature is mounted at. */
export const NOTES_PATH = '/notes';

/**
 * The notes feature: `CrudProvider` sets up the store, the effects and the
 * REST client of `notesConfig`, and `SmartCrudPages` renders the page the URL
 * leads to: the list on /notes, the add form on /notes/add and a note on
 * /notes/:id, read-only until Edit (or `?edit=1`) turns it into the form.
 */
export function NotesFeature() {
  return (
    <CrudProvider config={notesConfig}>
      <SmartCrudPages basePath={NOTES_PATH} />
    </CrudProvider>
  );
}
