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
function validateModel(data: any): Session.IModel {
  let model = {
    id: data.id,
    path: data.notebook ? data.notebook.path : data.path,
    type: data.notebook ? 'notebook' : data.type,
    name: data.notebook ? '' : data.name,
    kernel: data.kernel
  };
  validateProperty(model, 'id', 'string');
  validateProperty(model, 'type', 'string');
  validateProperty(model, 'name', 'string');
  validateProperty(model, 'path', 'string');
  validateProperty(model, 'kernel', 'object');
  validateKernelModel(model.kernel);
  return model;
}
