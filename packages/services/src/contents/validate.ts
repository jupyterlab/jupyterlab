// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents
} from './index';


/**
 * Validate a property as being on an object, and optionally
 * of a given type.
 */
function validateProperty(object: any, name: string, typeName?: string): void {
  if (!object.hasOwnProperty(name)) {
    throw Error(`Missing property '${name}'`);
  }
  if (typeName !== void 0) {
    let valid = true;
    let value = object[name];
    switch (typeName) {
    case 'array':
      valid = Array.isArray(value);
      break;
    case 'object':
      valid = typeof value !== 'undefined';
      break;
    default:
      valid = typeof value === typeName;
    }
    if (!valid) {
      throw new Error(`Property '${name}' is not of type '${typeName}`);
    }
  }
}

/**
 * Validate an `Contents.IModel` object.
 */
export
function validateContentsModel(model: Contents.IModel): void {
  validateProperty(model, 'name', 'string');
  validateProperty(model, 'path', 'string');
  validateProperty(model, 'type', 'string');
  validateProperty(model, 'created', 'string');
  validateProperty(model, 'last_modified', 'string');
  validateProperty(model, 'mimetype', 'object');
  validateProperty(model, 'content', 'object');
  validateProperty(model, 'format', 'object');
}


/**
 * Validate an `Contents.ICheckpointModel` object.
 */
export
function validateCheckpointModel(model: Contents.ICheckpointModel): void  {
  validateProperty(model, 'id', 'string');
  validateProperty(model, 'last_modified', 'string');
}
