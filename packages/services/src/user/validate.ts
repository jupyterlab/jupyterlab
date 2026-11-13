// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type * as User from './user';
import { isRecord, validateProperty } from '../validate';

/**
 * Validate a user identity object.
 */
export function validateIdentity(
  identity: unknown
): asserts identity is User.IIdentity {
  validateProperty(identity, 'username', 'string');
  validateProperty(identity, 'name', 'string');
  validateProperty(identity, 'display_name', 'string');

  for (const prop of ['initials', 'color', 'avatar_url'] as const) {
    if (
      isRecord(identity) &&
      Object.prototype.hasOwnProperty.call(identity, prop) &&
      identity[prop] !== undefined &&
      identity[prop] !== null
    ) {
      validateProperty(identity, prop, 'string');
    }
  }
}

/**
 * Validate a `User.IUser` object.
 */
export function validateUser(user: unknown): asserts user is User.IUser {
  validateProperty(user, 'identity', 'object');
  validateProperty(user, 'permissions', 'object');
  validateIdentity(user.identity);
}
