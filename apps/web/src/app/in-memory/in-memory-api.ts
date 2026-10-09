import { Note } from '@app/model';

import { AUTH_CLIENT_ID, TOKEN_URL } from '../auth/login.service';
import { notesConfig } from '../notes/notes.config';

/**
 * A test double of the API for the hosted demo, where no server can run. It
 * is a `fetch` for the HTTP client of `SmartProvider`: it answers the requests
 * the frontend makes, with the status codes and bodies the real API sends for
 * them, and nothing else: no refresh grant, no bulk create, no export.
 * Anything it does not know is passed on to the network.
 *
 * The notes live in `sessionStorage`, so a reload of the demo shows the same
 * notes and a new tab starts from the seed again, the same way they would
 * come back from the database.
 */

/** The user the real API seeds, with the password from `.env.example`. */
export const DEMO_CREDENTIALS = {
  username: 'admin@example.com',
  password: 'change-me',
};

/** Lifetime of the issued token in seconds, the default of `JWT_EXPIRES_IN`. */
const TOKEN_LIFETIME = 3600;

/** Key the notes are kept under in `sessionStorage`. */
export const DEMO_NOTES_KEY = 'DEMO_NOTES';

/** The note every fresh demo starts with, so the list is not empty. */
const SEED: Note[] = [
  {
    id: '000000000000000000000001',
    title: 'Welcome to the demo',
    content:
      '<p>This note comes from an in-memory double of the API. Add, edit and remove notes; they stay in this browser tab only.</p>',
  },
];

const NOTES_URL = notesConfig.apiUrl;

interface IPasswordGrant {
  grant_type: string;
  username: string;
  password: string;
  client_id: string;
}

/** What the double reads from a request. */
interface IRequest {
  method: string;
  pathname: string;
  params: URLSearchParams;
  headers: Headers;
  body: unknown;
}

/** What the double answers, before it becomes a `Response`. */
interface IReply {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface IInMemoryApiOptions {
  /** Where the notes are kept: `sessionStorage` by default, `null` for nowhere. */
  storage?: Storage | null;
  /** What answers the requests the double does not know: `fetch` by default. */
  network?: typeof fetch;
}

/** Base64url of a JSON value, the encoding of a JWT segment. The payload is ASCII. */
function base64url(value: unknown): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** A 24 character hex id, the shape MongoDB gives the real notes. */
function newId(): string {
  const seconds = Math.floor(Date.now() / 1000).toString(16);
  const random = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');

  return (seconds + random).slice(0, 24);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sessionStorageOrNull(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Creates the double: a `fetch` to hand to `SmartHttpClient`, which is what
 * the `demo` build gives `SmartProvider` (see in-memory-api.providers.demo.ts).
 */
export function createInMemoryApi(
  options: IInMemoryApiOptions = {},
): typeof fetch {
  const storage =
    options.storage === undefined ? sessionStorageOrNull() : options.storage;
  const notes = load(storage);

  const save = () => {
    try {
      storage?.setItem(DEMO_NOTES_KEY, JSON.stringify(notes));
    } catch {
      // Without storage the notes still live for as long as the page does.
    }
  };

  const grantToken = ({ body }: IRequest): IReply => {
    const grant = (body ?? {}) as Partial<IPasswordGrant>;

    if (grant.grant_type !== 'password' || grant.client_id !== AUTH_CLIENT_ID) {
      return { status: 400, body: { details: 'Invalid grant' } };
    }

    if (
      grant.username !== DEMO_CREDENTIALS.username ||
      grant.password !== DEMO_CREDENTIALS.password
    ) {
      return { status: 400, body: { details: 'Invalid username or password' } };
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    // A syntactically valid JWT: `AuthService` decodes the payload for `exp`
    // and `permissions` and never verifies the signature, so the third
    // segment is a placeholder.
    const accessToken = [
      base64url({ alg: 'HS256', typ: 'JWT' }),
      base64url({
        permissions: ['admin'],
        username: grant.username,
        sub: grant.username,
        iat: issuedAt,
        exp: issuedAt + TOKEN_LIFETIME,
      }),
      base64url('in-memory'),
    ].join('.');

    return {
      status: 200,
      body: {
        access_token: accessToken,
        refresh_token: newId(),
        token_type: 'bearer',
        expired_in: TOKEN_LIFETIME,
        username: grant.username,
      },
    };
  };

  const list = ({ params }: IRequest): IReply => {
    let data = [...notes];

    const search = params.get('$search')?.toLowerCase();
    if (search) {
      data = data.filter((note) =>
        [note.title, note.content].some((value) =>
          value?.toLowerCase().includes(search),
        ),
      );
    }

    const sort = params.get('sort');
    if (sort) {
      const desc = sort.startsWith('-');
      const key = (desc ? sort.slice(1) : sort) as keyof Note;

      data.sort(
        (a, b) =>
          String(a[key] ?? '').localeCompare(String(b[key] ?? '')) *
          (desc ? -1 : 1),
      );
    }

    const totalCount = data.length;
    const limit = Number(params.get('limit')) || 0;
    const offset = Number(params.get('offset')) || 0;

    if (limit) data = data.slice(offset, offset + limit);

    return {
      status: 200,
      body: {
        data,
        totalCount,
        links: links(params, offset, limit, totalCount),
      },
    };
  };

  const create = ({ body }: IRequest): IReply => {
    const note = (body ?? {}) as Partial<Note>;

    if (!hasText(note.title)) {
      return { status: 400, body: { details: 'Required fields: title' } };
    }

    const created: Note = { ...note, id: newId(), title: note.title };
    notes.push(created);
    save();

    return {
      status: 200,
      body: { id: created.id },
      headers: { Location: `${NOTES_URL}/${created.id}` },
    };
  };

  const update = (index: number, note: Partial<Note>): IReply => {
    if (!hasText(note.title)) {
      return { status: 400, body: { details: 'Required fields: title' } };
    }

    notes[index] = { ...note, id: notes[index].id, title: note.title };
    save();

    return { status: 200, body: null };
  };

  const notesRoute = (request: IRequest): IReply => {
    const { method, pathname, headers } = request;
    const id = pathname.slice(NOTES_URL.length + 1);
    const anonymous = !headers.get('Authorization')?.startsWith('Bearer ');

    // The real API lets an anonymous read reach the permission check, which
    // forbids it, and stops an anonymous write at the JWT guard.
    if (anonymous) {
      return method === 'GET'
        ? { status: 403, body: { details: 'Context forbidden' } }
        : { status: 401, body: { details: 'Unauthorized' } };
    }

    // What NestJS answers for a route the controller does not declare.
    const unknownRoute: IReply = {
      status: 404,
      body: { details: `Cannot ${method} ${pathname}` },
    };

    if (!id) {
      if (method === 'GET') return list(request);
      if (method === 'POST') return create(request);

      return unknownRoute;
    }

    const index = notes.findIndex((note) => note.id === id);

    if (index < 0) return { status: 404, body: { details: 'Invalid id' } };

    switch (method) {
      case 'GET':
        return { status: 200, body: notes[index] };
      case 'PUT':
        return update(index, request.body as Partial<Note>);
      case 'PATCH':
        return update(index, {
          ...notes[index],
          ...(request.body as Partial<Note>),
        });
      case 'DELETE':
        notes.splice(index, 1);
        save();
        return { status: 200, body: null };
      default:
        return unknownRoute;
    }
  };

  const route = (request: IRequest): IReply | null => {
    if (request.method === 'POST' && request.pathname === TOKEN_URL) {
      return grantToken(request);
    }

    if (
      request.pathname === NOTES_URL ||
      request.pathname.startsWith(NOTES_URL + '/')
    ) {
      return notesRoute(request);
    }

    return null;
  };

  return async (input, init) => {
    // `SmartHttpClient` sends a URL string and a JSON string body.
    const reply =
      typeof input === 'string' || input instanceof URL
        ? route(toRequest(String(input), init))
        : null;

    if (!reply) return (options.network ?? fetch)(input, init);

    // Always answered on a later tick: a double that answered synchronously
    // would hide bugs the real client cannot have.
    await new Promise((resolve) => setTimeout(resolve, 0));

    return toResponse(reply);
  };
}

/** The paging links of the real list response: `null` without a limit. */
function links(
  params: URLSearchParams,
  offset: number,
  limit: number,
  totalCount: number,
): Record<string, string> | null {
  if (!limit) return null;

  const result: Record<string, string> = {};
  const page = (at: number) => {
    const query = new URLSearchParams(params);
    query.set('offset', String(at));
    return `${NOTES_URL}?${query}`;
  };
  const lastOffset = Math.max(Math.ceil(totalCount / limit) - 1, 0) * limit;

  if (offset > 0) {
    result['prev'] = page(Math.max(offset - limit, 0));
    result['first'] = page(0);
  }
  if (offset + limit < totalCount) {
    result['next'] = page(Math.min(offset + limit, lastOffset));
    result['last'] = page(lastOffset);
  }

  return result;
}

function toRequest(url: string, init: RequestInit | undefined): IRequest {
  const { pathname, searchParams } = new URL(url, 'http://in-memory');
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;

  return {
    method: (init?.method ?? 'GET').toUpperCase(),
    pathname,
    params: searchParams,
    headers: new Headers(init?.headers),
    body,
  };
}

function toResponse({ status, body, headers = {} }: IReply): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function load(storage: Storage | null): Note[] {
  try {
    const stored = storage?.getItem(DEMO_NOTES_KEY);
    if (stored) return JSON.parse(stored) as Note[];
  } catch {
    // Storage that cannot be read, or that holds something else: start over.
  }

  return SEED.map((note) => ({ ...note }));
}
