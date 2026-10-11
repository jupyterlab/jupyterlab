// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISpecModel, ISpecModels } from './restapi';
import type { PartialJSONObject } from '@lumino/coreutils';
import { isRecord, validateProperty } from '../validate';

/**
 * Validate a server kernelspec model to a client side model.
 */
export function validateSpecModel(data: unknown): ISpecModel {
  validateProperty(data, 'spec', 'object');
  const spec = data.spec;

  validateProperty(data, 'name', 'string');
  validateProperty(data, 'resources', 'object');
  validateProperty(spec, 'language', 'string');
  validateProperty(spec, 'display_name', 'string');
  validateProperty(spec, 'argv', 'array');

  let metadata: PartialJSONObject | null = null;
  if (Object.prototype.hasOwnProperty.call(spec, 'metadata')) {
    validateProperty(spec, 'metadata', 'object');
    metadata = spec.metadata as PartialJSONObject;
  }

  let env: PartialJSONObject | null = null;
  if (Object.prototype.hasOwnProperty.call(spec, 'env')) {
    validateProperty(spec, 'env', 'object');
    env = spec.env as PartialJSONObject;
  }
  if (Object.prototype.hasOwnProperty.call(spec, 'interrupt_mode')) {
    validateProperty(spec, 'interrupt_mode', 'string');
    env = spec.env as PartialJSONObject;
  }
  return {
    name: data.name as string,
    resources: data.resources as { [key: string]: string },
    language: spec.language as string,
    display_name: spec.display_name as string,
    argv: spec.argv as string[],
    metadata: metadata as ISpecModel['metadata'],
    env: env as ISpecModel['env']
  };
}

/**
 * Validate a `Kernel.ISpecModels` object.
 */
export function validateSpecModels(data: unknown): ISpecModels {
  if (
    isRecord(data) &&
    !Object.prototype.hasOwnProperty.call(data, 'kernelspecs')
  ) {
    throw new Error('No kernelspecs found');
  }
  validateProperty(data, 'kernelspecs', 'object');
  let keys = Object.keys(data.kernelspecs as Record<string, unknown>);
  const kernelspecs: { [key: string]: ISpecModel } = Object.create(null);
  let defaultSpec = data.default;

  for (let i = 0; i < keys.length; i++) {
    const ks = (data.kernelspecs as Record<string, unknown>)[keys[i]];
    try {
      kernelspecs[keys[i]] = validateSpecModel(ks);
    } catch {
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
    default: defaultSpec as string,
    kernelspecs
  };
}
