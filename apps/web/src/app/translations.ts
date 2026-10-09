import { SmartTranslations } from '@smartsoft001/react';

/**
 * Labels the generated screens look up: the page title from `notesConfig.title`
 * and `MODEL.<field>` for every decorated field of `Note`. The framework ships
 * its own strings (buttons, validation) under the same two language codes, and
 * `SmartProvider` merges the dictionary of its language over them.
 */
export const APP_TRANSLATIONS: Record<string, SmartTranslations> = {
  eng: {
    Notes: 'Notes',
    MODEL: { title: 'Title', content: 'Content' },
  },
  pl: {
    Notes: 'Notatki',
    MODEL: { title: 'Tytuł', content: 'Treść' },
  },
};

/** The language the application starts in. */
export const APP_LANGUAGE = 'eng';
