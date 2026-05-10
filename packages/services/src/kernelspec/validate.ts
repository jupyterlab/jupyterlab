// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import type { ISpecModel, ISpecModels } from './restapi';
import { validateProperty } from '../validate';

type JSONRecord = {
  [key: string]: unknown;
};

/**
 * Validate a server kernelspec model to a client side model.
 */
export function validateSpecModel(data: JSONRecord): ISpecModel {
  const spec = data.spec;
  if (!spec || typeof spec !== 'object') {
    throw new Error('Invalid kernel spec');
  }
  const specRecord = spec as JSONRecord;
  validateProperty(data, 'name', 'string');
  validateProperty(data, 'resources', 'object');
  validateProperty(specRecord, 'language', 'string');
  validateProperty(specRecord, 'display_name', 'string');
  validateProperty(specRecord, 'argv', 'array');

  let metadata: unknown = null;
  if (specRecord.hasOwnProperty('metadata')) {
    validateProperty(specRecord, 'metadata', 'object');
    metadata = specRecord.metadata;
  }

  let env: unknown = null;
  if (specRecord.hasOwnProperty('env')) {
    validateProperty(specRecord, 'env', 'object');
    env = specRecord.env;
  }
  if (specRecord.hasOwnProperty('interrupt_mode')) {
    validateProperty(specRecord, 'interrupt_mode', 'string');
    env = specRecord.env;
  }
  return {
    name: data.name as string,
    resources: data.resources as ISpecModel['resources'],
    language: specRecord.language as string,
    display_name: specRecord.display_name as string,
    argv: specRecord.argv as string[],
    metadata,
    env
  };
}

/**
 * Validate a `Kernel.ISpecModels` object.
 */
export function validateSpecModels(data: JSONRecord): ISpecModels {
  if (!data.hasOwnProperty('kernelspecs')) {
    throw new Error('No kernelspecs found');
  }
  const rawKernelSpecs = data.kernelspecs;
  if (!rawKernelSpecs || typeof rawKernelSpecs !== 'object') {
    throw new Error('No kernelspecs found');
  }
  const kernelSpecsRecord = rawKernelSpecs as Record<string, JSONRecord>;
  let keys = Object.keys(kernelSpecsRecord);
  const kernelspecs: { [key: string]: ISpecModel } = Object.create(null);
  let defaultSpec = data.default;

  for (let i = 0; i < keys.length; i++) {
    const ks = kernelSpecsRecord[keys[i]];
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
