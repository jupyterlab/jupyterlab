// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection, type User } from '../../src';
import { UserAPIClient } from '../../src/user/restapi';
import { validateIdentity, validateUser } from '../../src/user/validate';

describe('user/validate', () => {
  const validIdentity: User.IIdentity = {
    username: 'jovyan',
    name: 'Jovyan User',
    display_name: 'Jovyan',
    initials: 'JU',
    color: '#1976d2',
    avatar_url: 'https://example.com/avatar.png'
  };

  const validUser: User.IUser = {
    identity: validIdentity,
    permissions: {}
  };

  describe('#validateIdentity()', () => {
    it('should pass a valid identity', () => {
      expect(() => {
        validateIdentity(validIdentity);
      }).not.toThrow();
    });

    it('should pass a valid identity without optional avatar_url', () => {
      const identity = { ...validIdentity };
      delete (identity as any).avatar_url;
      expect(() => {
        validateIdentity(identity);
      }).not.toThrow();
    });

    it('should fail on missing username', () => {
      const identity: any = { ...validIdentity };
      delete identity.username;
      expect(() => validateIdentity(identity)).toThrow();
    });

    it('should fail on missing name', () => {
      const identity: any = { ...validIdentity };
      delete identity.name;
      expect(() => validateIdentity(identity)).toThrow();
    });

    it('should fail on missing display_name', () => {
      const identity: any = { ...validIdentity };
      delete identity.display_name;
      expect(() => validateIdentity(identity)).toThrow();
    });

    it('should fail on missing initials', () => {
      const identity: any = { ...validIdentity };
      delete identity.initials;
      expect(() => validateIdentity(identity)).toThrow();
    });

    it('should fail on missing color', () => {
      const identity: any = { ...validIdentity };
      delete identity.color;
      expect(() => validateIdentity(identity)).toThrow();
    });

    it('should fail on invalid property types', () => {
      expect(() =>
        validateIdentity({ ...validIdentity, username: 123 })
      ).toThrow();
      expect(() =>
        validateIdentity({ ...validIdentity, avatar_url: 123 })
      ).toThrow();
    });

    it('should fail if identity is not an object', () => {
      expect(() => validateIdentity(null)).toThrow();
      expect(() => validateIdentity('invalid')).toThrow();
    });
  });

  describe('#validateUser()', () => {
    it('should pass a valid user', () => {
      expect(() => {
        validateUser(validUser);
      }).not.toThrow();
    });

    it('should fail on missing identity', () => {
      const user: any = { permissions: {} };
      expect(() => validateUser(user)).toThrow();
    });

    it('should fail on missing permissions', () => {
      const user: any = { identity: validIdentity };
      expect(() => validateUser(user)).toThrow();
    });

    it('should fail on invalid identity', () => {
      const user: any = {
        identity: { ...validIdentity, username: 123 },
        permissions: {}
      };
      expect(() => validateUser(user)).toThrow();
    });

    it('should fail if user is not an object', () => {
      expect(() => validateUser(null)).toThrow();
      expect(() => validateUser('invalid')).toThrow();
    });
  });

  describe('UserAPIClient', () => {
    it('should validate response from get()', async () => {
      const serverSettings = ServerConnection.makeSettings({
        fetch: async () =>
          new Response(JSON.stringify(validUser), { status: 200 })
      });
      const client = new UserAPIClient({ serverSettings });
      const user = await client.get();
      expect(user.identity.username).toBe('jovyan');
    });

    it('should reject with validation error if response is invalid', async () => {
      const serverSettings = ServerConnection.makeSettings({
        fetch: async () =>
          new Response(JSON.stringify({ invalid: 'user' }), { status: 200 })
      });
      const client = new UserAPIClient({ serverSettings });
      await expect(client.get()).rejects.toThrow();
    });
  });
});
