// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISpecModel, ISpecModels } from './restapi';
import { validateProperty } from '../validate';

/**
 * Validate a server kernelspec model to a client side model.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function validateSpecModel(data: any): ISpecModel {
  const spec = data.spec;
  if (!spec) {
    throw new Error('Invalid kernel spec');
  }
  validateProperty(data, 'name', 'string');
  validateProperty(data, 'resources', 'object');
  validateProperty(spec, 'language', 'string');
  validateProperty(spec, 'display_name', 'string');
  validateProperty(spec, 'argv', 'array');

  let metadata: any = null;
  if (spec.hasOwnProperty('metadata')) {
    validateProperty(spec, 'metadata', 'object');
    metadata = spec.metadata;
  }

  let env: any = null;
  if (spec.hasOwnProperty('env')) {
    validateProperty(spec, 'env', 'object');
    env = spec.env;
  }
  return {
    name: data.name,
    resources: data.resources,
    language: spec.language,
    display_name: spec.display_name,
    argv: spec.argv,
    metadata,
    env
  };
}

/**
 * Validate a `Kernel.ISpecModels` object.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function validateSpecModels(data: any): ISpecModels {
  if (!data.hasOwnProperty('kernelspecs')) {
    throw new Error('No kernelspecs found');
  }
  let keys = Object.keys(data.kernelspecs);
  const kernelspecs: { [key: string]: ISpecModel } = Object.create(null);
  let defaultSpec = data.default;

  for (let i = 0; i < keys.length; i++) {
    const ks = data.kernelspecs[keys[i]];
    try {
      kernelspecs[keys[i]] = validateSpecModel(ks);
    } catch (err) {
      // Remove the errant kernel spec.
      console.warn(`Removing errant kernel spec: ${keys[i]}`);
    }
  }
  keys = Object.keys(kernelspecs);
  if (!keys.length) {
    throw new Error('No valid kernelspecs found');
  }
  if (
    !defaultSpec ||
    typeof defaultSpec !== 'string' ||
    !(defaultSpec in kernelspecs)
  ) {
    defaultSpec = keys[0];
    console.warn(`Default kernel not found, using '${keys[0]}'`);
  }
  return {
    default: defaultSpec,
    kernelspecs
  };
}
