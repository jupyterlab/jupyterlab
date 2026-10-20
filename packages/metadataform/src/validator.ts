// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { PromiseDelegate } from '@lumino/coreutils';
import { getDefaultFormState } from '@rjsf/utils';
import type validatorAjv8 from '@rjsf/validator-ajv8';

import type { MetadataForm } from './token';

let validatorLoaded: PromiseDelegate<typeof validatorAjv8> | null = null;

/**
 * The validator once it has loaded, for the synchronous code paths.
 */
let validator: typeof validatorAjv8 | null = null;

/**
 * Lazily load the validator when the first form is created.
 */
export async function ensureValidator(): Promise<typeof validatorAjv8> {
  if (validatorLoaded == null) {
    validatorLoaded = new PromiseDelegate();
    validator = (await import('@rjsf/validator-ajv8')).default;
    validatorLoaded.resolve(validator);
  }
  return validatorLoaded.promise;
}

/**
 * Get the validator, or null before it has loaded.
 */
export function getValidator(): typeof validatorAjv8 | null {
  return validator;
}

/**
 * Get the form data with the values that the form fills in for missing keys,
 * such as defaults, or null before the validator has loaded.
 */
export function fillFormData(
  schema: MetadataForm.IMetadataSchema,
  formData: ReadonlyPartialJSONObject
): ReadonlyPartialJSONObject | null {
  if (validator === null) {
    return null;
  }
  return getDefaultFormState(
    validator,
    schema,
    formData,
    schema
  ) as ReadonlyPartialJSONObject;
}
