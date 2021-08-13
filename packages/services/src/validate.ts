// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Validate a property as being on an object, and optionally
 * of a given type and among a given set of values.
 */
export function validateProperty(
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  object: any,
  name: string,
  typeName?: string,
  values: any[] = []
): void {
  if (!object.hasOwnProperty(name)) {
    throw Error(`Missing property '${name}'`);
  }
  const value = object[name];

  if (typeName !== void 0) {
    let valid = true;
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
      throw new Error(`Property '${name}' is not of type '${typeName}'`);
    }

    if (values.length > 0) {
      let valid = true;
      switch (typeName) {
        case 'string':
        case 'number':
        case 'boolean':
          valid = values.includes(value);
          break;
        default:
          valid = values.findIndex(v => v === value) >= 0;
          break;
      }
      if (!valid) {
        throw new Error(
          `Property '${name}' is not one of the valid values ${JSON.stringify(
            values
          )}`
        );
      }
    }
  }
}
