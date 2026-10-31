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
  validateProperty(identity, 'initials', 'string');
  validateProperty(identity, 'color', 'string');

  if (
    isRecord(identity) &&
    Object.prototype.hasOwnProperty.call(identity, 'avatar_url') &&
    identity.avatar_url !== undefined &&
    identity.avatar_url !== null
  ) {
    validateProperty(identity, 'avatar_url', 'string');
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
