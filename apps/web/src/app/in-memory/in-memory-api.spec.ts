/**
 * @jest-environment node
 */
import { jwtDecode } from 'jwt-decode';

import { SmartHttpClient, SmartHttpError } from '@smartsoft001/react';

import { Note } from '@app/model';

import {
  createInMemoryApi,
  DEMO_CREDENTIALS,
  DEMO_NOTES_KEY,
} from './in-memory-api';
import { AUTH_CLIENT_ID, TOKEN_URL } from '../auth/login.service';
import { notesConfig } from '../notes/notes.config';

interface IList {
  data: Note[];
  totalCount: number;
  links: Record<string, string> | null;
}

/** `sessionStorage` for the node environment the double runs in here. */
class MemoryStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

/**
 * The double answers a real `SmartHttpClient`, the client the `demo` build
 * gives `SmartProvider`, so every assertion goes through `fetch`, `Response`
 * and the client's error handling. A request the double does not know would
 * reach `network`, which fails the test.
 */
describe('web: createInMemoryApi', () => {
  const notesUrl = notesConfig.apiUrl;
  const grant = {
    grant_type: 'password',
    ...DEMO_CREDENTIALS,
    client_id: AUTH_CLIENT_ID,
  };
  const authorized = { headers: { Authorization: 'Bearer any-token' } };

  let storage: MemoryStorage;
  let network: jest.Mock;
  let http: SmartHttpClient;

  const start = () => {
    http = new SmartHttpClient({
      fetch: createInMemoryApi({
        storage: storage as unknown as Storage,
        network: network as unknown as typeof fetch,
      }),
    });
  };

  const failure = async (
    request: Promise<unknown>,
  ): Promise<SmartHttpError> => {
    try {
      await request;
    } catch (error) {
      return error as SmartHttpError;
    }

    throw new Error('expected the request to fail');
  };

  const list = (query = ''): Promise<IList> =>
    http.get<IList>(`${notesUrl}${query}`, authorized);

  const create = (note: Partial<Note>): Promise<string> =>
    http
      .post<{ id: string }>(notesUrl, note, authorized)
      .then((response) => response.id);

  beforeEach(() => {
    storage = new MemoryStorage();
    network = jest.fn(async () => {
      throw new Error('the double sent a request to the network');
    });
    start();
  });

  describe('POST /api/token', () => {
    it('should grant a token with the fields of the real API for the seeded credentials', async () => {
      // Act
      const token = await http.post<Record<string, unknown>>(TOKEN_URL, grant);

      // Assert
      expect(token).toEqual({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        token_type: 'bearer',
        expired_in: 3600,
        username: DEMO_CREDENTIALS.username,
      });
    });

    it('should issue a JWT AuthService can decode, valid for an hour with the admin permission', async () => {
      // Arrange
      const now = Math.floor(Date.now() / 1000);

      // Act
      const { access_token } = await http.post<{ access_token: string }>(
        TOKEN_URL,
        grant,
      );

      // Assert
      const payload = jwtDecode<{
        exp: number;
        permissions: string[];
        username: string;
      }>(access_token);
      expect(access_token.split('.')).toHaveLength(3);
      expect(payload.permissions).toEqual(['admin']);
      expect(payload.username).toBe(DEMO_CREDENTIALS.username);
      expect(payload.exp).toBeGreaterThanOrEqual(now + 3600);
    });

    it('should reject a wrong password with the 400 and the message of the real API', async () => {
      // Act
      const error = await failure(
        http.post(TOKEN_URL, { ...grant, password: 'not-the-password' }),
      );

      // Assert
      expect(error.status).toBe(400);
      expect(error.body).toEqual({ details: 'Invalid username or password' });
    });

    it('should reject a grant of another client with 400', async () => {
      // Act
      const error = await failure(
        http.post(TOKEN_URL, { ...grant, client_id: 'another-app' }),
      );

      // Assert
      expect(error.status).toBe(400);
      expect(error.body).toEqual({ details: 'Invalid grant' });
    });

    it('should answer on a later tick, like a request over the network', async () => {
      // Arrange
      let answered = false;

      // Act
      const request = http.post(TOKEN_URL, grant).then(() => (answered = true));
      await Promise.resolve();

      // Assert
      expect(answered).toBe(false);
      await request;
      expect(answered).toBe(true);
    });
  });

  describe('without a bearer token', () => {
    it('should forbid a read with 403', async () => {
      // Act
      const error = await failure(http.get(notesUrl));

      // Assert
      expect(error.status).toBe(403);
    });

    it('should refuse a write with 401', async () => {
      // Act
      const error = await failure(http.post(notesUrl, { title: 'x' }));

      // Assert
      expect(error.status).toBe(401);
    });
  });

  describe('GET /api/notes', () => {
    it('should list the seeded note in the shape of the real API', async () => {
      // Act
      const result = await list();

      // Assert
      expect(result).toEqual({
        data: [expect.objectContaining({ id: expect.any(String) })],
        totalCount: 1,
        links: null,
      });
    });

    it('should search, sort, page and count what the query asks for', async () => {
      // Arrange
      await create({ title: 'Banana' });
      await create({ title: 'Apple' });
      await create({ title: 'Cherry' });

      // Act
      const searched = await list('?$search=NAN');
      const sorted = await list('?sort=-title');
      const paged = await list('?limit=2&offset=1&sort=title');

      // Assert
      expect(searched.data.map((note) => note.title)).toEqual(['Banana']);
      expect(sorted.data.map((note) => note.title)).toEqual([
        'Welcome to the demo',
        'Cherry',
        'Banana',
        'Apple',
      ]);
      expect(paged.data.map((note) => note.title)).toEqual([
        'Banana',
        'Cherry',
      ]);
      expect(paged.totalCount).toBe(4);
      expect(paged.links).toEqual({
        prev: expect.stringContaining('offset=0'),
        first: expect.stringContaining('offset=0'),
        next: expect.stringContaining('offset=2'),
        last: expect.stringContaining('offset=2'),
      });
    });

    it('should answer the first read of the list page', async () => {
      // Act: the query `CrudService` builds from `notesConfig`.
      const result = await list('?limit=25&offset=0&sort=title');

      // Assert
      expect(result.data.map((note) => note.title)).toEqual([
        'Welcome to the demo',
      ]);
      expect(result.links).toEqual({});
    });
  });

  describe('POST /api/notes', () => {
    it('should reject a note without a title the way AppExceptionFilter does', async () => {
      // Act
      const error = await failure(create({ content: '<p>no title</p>' }));

      // Assert
      expect(error.status).toBe(400);
      expect(error.body).toEqual({ details: 'Required fields: title' });
    });

    it('should create a note with a MongoDB-like id and a Location header', async () => {
      // Act
      const response = await http.request<{ id: string }>({
        method: 'POST',
        url: notesUrl,
        body: { title: 'Created' },
        ...authorized,
      });

      // Assert
      const id = response.body.id;
      expect(id).toMatch(/^[0-9a-f]{24}$/);
      expect(response.headers.get('Location')).toBe(`${notesUrl}/${id}`);
      expect((await list()).data).toContainEqual({ id, title: 'Created' });
    });
  });

  describe('/api/notes/:id', () => {
    it('should return the note by id and 404 for an unknown id', async () => {
      // Arrange
      const id = await create({ title: 'By id', content: '<p>body</p>' });

      // Act
      const note = await http.get<Note>(`${notesUrl}/${id}`, authorized);
      const missing = await failure(
        http.get(`${notesUrl}/000000000000000000000abc`, authorized),
      );

      // Assert
      expect(note).toEqual({ id, title: 'By id', content: '<p>body</p>' });
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ details: 'Invalid id' });
    });

    it('should replace the note on PUT and keep its id', async () => {
      // Arrange
      const id = await create({ title: 'Before', content: '<p>old</p>' });

      // Act
      await http.put(`${notesUrl}/${id}`, { id, title: 'After' }, authorized);

      // Assert
      expect(await http.get<Note>(`${notesUrl}/${id}`, authorized)).toEqual({
        id,
        title: 'After',
      });
    });

    it('should merge the fields on PATCH and validate the title', async () => {
      // Arrange
      const id = await create({ title: 'Before', content: '<p>kept</p>' });

      // Act
      await http.patch(`${notesUrl}/${id}`, { id, title: 'After' }, authorized);
      const invalid = await failure(
        http.patch(`${notesUrl}/${id}`, { title: '' }, authorized),
      );

      // Assert
      expect(await http.get<Note>(`${notesUrl}/${id}`, authorized)).toEqual({
        id,
        title: 'After',
        content: '<p>kept</p>',
      });
      expect(invalid.status).toBe(400);
    });

    it('should delete the note and answer 404 for a second delete', async () => {
      // Arrange
      const id = await create({ title: 'Doomed' });

      // Act
      const deleted = await http.delete(`${notesUrl}/${id}`, authorized);
      const again = await failure(http.delete(`${notesUrl}/${id}`, authorized));

      // Assert
      expect(deleted).toBeNull();
      expect((await list()).totalCount).toBe(1);
      expect(again.status).toBe(404);
    });

    it('should answer 404 for a method the API does not declare', async () => {
      // Act
      const error = await failure(
        http.request({ method: 'PUT', url: notesUrl, body: {}, ...authorized }),
      );

      // Assert
      expect(error.status).toBe(404);
      expect(error.body).toEqual({ details: `Cannot PUT ${notesUrl}` });
    });
  });

  describe('storage', () => {
    it('should keep the notes in the storage so a reload of the demo shows them again', async () => {
      // Act
      const id = await create({ title: 'Survives a reload' });

      // Assert
      const stored = JSON.parse(
        storage.getItem(DEMO_NOTES_KEY) ?? '[]',
      ) as Note[];
      expect(stored).toContainEqual({ id, title: 'Survives a reload' });
    });

    it('should start from what a previous instance stored', async () => {
      // Arrange
      storage.setItem(
        DEMO_NOTES_KEY,
        JSON.stringify([{ id: '0000000000000000000000ab', title: 'Stored' }]),
      );
      start();

      // Act
      const result = await list();

      // Assert
      expect(result.data).toEqual([
        { id: '0000000000000000000000ab', title: 'Stored' },
      ]);
    });

    it('should start from the seed when the storage holds something else', async () => {
      // Arrange
      storage.setItem(DEMO_NOTES_KEY, 'not json');
      start();

      // Act
      const result = await list();

      // Assert
      expect(result.data.map((note) => note.title)).toEqual([
        'Welcome to the demo',
      ]);
    });
  });

  describe('anything else', () => {
    it('should pass a request the double does not know on to the network', async () => {
      // Arrange
      network.mockResolvedValueOnce(new Response('{"ok":true}'));

      // Act
      const result = await http.get('/api/other');

      // Assert
      expect(result).toEqual({ ok: true });
      expect(network).toHaveBeenCalledWith(
        '/api/other',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });
});
