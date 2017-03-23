// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  validateModel as validateKernelModel
} from '../kernel/validate';

import {
  Session
} from './session';


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
 * Validate an `Session.IModel` object.
 */
export
function validateModel(model: Session.IModel): void {
  validateProperty(model, 'id', 'string');
  validateProperty(model, 'notebook', 'object');
  validateProperty(model, 'kernel', 'object');
  validateKernelModel(model.kernel);
  validateProperty(model.notebook, 'path', 'string');
}
