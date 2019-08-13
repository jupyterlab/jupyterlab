/*-----------------------------------------------------------------------------
This code is based on code from PhosphorJS under the following license:

Copyright (c) 2014-2017, PhosphorJS Contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
----------------------------------------------------------------------------*/

import { JSONPrimitive } from '@phosphor/coreutils';

/**
 * A type alias for a JSON value.
 */
export type PartialJSONValue =
  | JSONPrimitive
  | PartialJSONObject
  | PartialJSONArray;

/**
 * A type definition for a JSON object.
 */
// tslint:disable-next-line:interface-name
export interface PartialJSONObject {
  [key: string]: PartialJSONValue | undefined;
}

/**
 * A type definition for a JSON array.
 */
// tslint:disable-next-line:interface-name
export interface PartialJSONArray extends Array<PartialJSONValue> {}

/**
 * A type definition for a readonly JSON object.
 */
// tslint:disable-next-line:interface-name
export interface ReadonlyPartialJSONObject {
  readonly [key: string]: ReadonlyPartialJSONValue | undefined;
}

/**
 * A type definition for a readonly JSON array.
 */
// tslint:disable-next-line:interface-name
export interface ReadonlyPartialJSONArray
  extends ReadonlyArray<ReadonlyPartialJSONValue> {}

/**
 * A type alias for a readonly JSON value.
 */
export type ReadonlyPartialJSONValue =
  | JSONPrimitive
  | ReadonlyPartialJSONObject
  | ReadonlyPartialJSONArray;

/**
 * The namespace for JSON-specific functions.
 */
export namespace PartialJSONExt {
  /**
   * A shared frozen empty JSONObject
   */
  export const emptyObject = Object.freeze({}) as ReadonlyPartialJSONObject;

  /**
   * A shared frozen empty JSONArray
   */
  export const emptyArray = Object.freeze([]) as ReadonlyPartialJSONArray;

  /**
   * Test whether a JSON value is a primitive.
   *
   * @param value - The JSON value of interest.
   *
   * @returns `true` if the value is a primitive,`false` otherwise.
   */
  export function isPrimitive(
    value: ReadonlyPartialJSONValue
  ): value is JSONPrimitive {
    return (
      value === null ||
      typeof value === 'boolean' ||
      typeof value === 'number' ||
      typeof value === 'string'
    );
  }

  /**
   * Test whether a JSON value is an array.
   *
   * @param value - The JSON value of interest.
   *
   * @returns `true` if the value is a an array, `false` otherwise.
   */
  export function isArray(value: PartialJSONValue): value is PartialJSONArray;
  export function isArray(
    value: ReadonlyPartialJSONValue
  ): value is ReadonlyPartialJSONArray;
  export function isArray(value: ReadonlyPartialJSONValue): boolean {
    return Array.isArray(value);
  }

  /**
   * Test whether a JSON value is an object.
   *
   * @param value - The JSON value of interest.
   *
   * @returns `true` if the value is a an object, `false` otherwise.
   */
  export function isObject(value: PartialJSONValue): value is PartialJSONObject;
  export function isObject(
    value: ReadonlyPartialJSONValue
  ): value is ReadonlyPartialJSONObject;
  export function isObject(value: ReadonlyPartialJSONValue): boolean {
    return !isPrimitive(value) && !isArray(value);
  }

  /**
   * Compare two JSON values for deep equality.
   *
   * @param first - The first JSON value of interest.
   *
   * @param second - The second JSON value of interest.
   *
   * @returns `true` if the values are equivalent, `false` otherwise.
   */
  export function deepEqual(
    first: ReadonlyPartialJSONValue,
    second: ReadonlyPartialJSONValue
  ): boolean {
    // Check referential and primitive equality first.
    if (first === second) {
      return true;
    }

    // If one is a primitive, the `===` check ruled out the other.
    if (isPrimitive(first) || isPrimitive(second)) {
      return false;
    }

    // Test whether they are arrays.
    let a1 = isArray(first);
    let a2 = isArray(second);

    // Bail if the types are different.
    if (a1 !== a2) {
      return false;
    }

    // If they are both arrays, compare them.
    if (a1 && a2) {
      return deepArrayEqual(
        first as ReadonlyPartialJSONArray,
        second as ReadonlyPartialJSONArray
      );
    }

    // At this point, they must both be objects.
    return deepObjectEqual(
      first as ReadonlyPartialJSONObject,
      second as ReadonlyPartialJSONObject
    );
  }

  /**
   * Create a deep copy of a JSON value.
   *
   * @param value - The JSON value to copy.
   *
   * @returns A deep copy of the given JSON value.
   */
  export function deepCopy<T extends ReadonlyPartialJSONValue>(value: T): T {
    // Do nothing for primitive values.
    if (isPrimitive(value)) {
      return value;
    }

    // Deep copy an array.
    if (isArray(value)) {
      return deepArrayCopy(value);
    }

    // Deep copy an object.
    return deepObjectCopy(value);
  }

  /**
   * Compare two JSON arrays for deep equality.
   */
  function deepArrayEqual(
    first: ReadonlyPartialJSONArray,
    second: ReadonlyPartialJSONArray
  ): boolean {
    // Check referential equality first.
    if (first === second) {
      return true;
    }

    // Test the arrays for equal length.
    if (first.length !== second.length) {
      return false;
    }

    // Compare the values for equality.
    for (let i = 0, n = first.length; i < n; ++i) {
      if (!deepEqual(first[i], second[i])) {
        return false;
      }
    }

    // At this point, the arrays are equal.
    return true;
  }

  /**
   * Compare two JSON objects for deep equality.
   */
  function deepObjectEqual(
    first: ReadonlyPartialJSONObject,
    second: ReadonlyPartialJSONObject
  ): boolean {
    // Check referential equality first.
    if (first === second) {
      return true;
    }

    // Check for the first object's keys in the second object.
    for (let key in first) {
      if (first[key] !== undefined && !(key in second)) {
        return false;
      }
    }

    // Check for the second object's keys in the first object.
    for (let key in second) {
      if (second[key] !== undefined && !(key in first)) {
        return false;
      }
    }

    // Compare the values for equality.
    for (let key in first) {
      // Get the values.
      let firstValue = first[key];
      let secondValue = second[key];

      // If both are undefined, ignore the key.
      if (firstValue === undefined && secondValue === undefined) {
        continue;
      }

      // If only one value is undefined, the objects are not equal.
      if (firstValue === undefined || secondValue === undefined) {
        return false;
      }

      // Compare the values.
      if (!deepEqual(firstValue, secondValue)) {
        return false;
      }
    }

    // At this point, the objects are equal.
    return true;
  }

  /**
   * Create a deep copy of a JSON array.
   */
  function deepArrayCopy(value: any): any {
    let result = new Array<any>(value.length);
    for (let i = 0, n = value.length; i < n; ++i) {
      result[i] = deepCopy(value[i]);
    }
    return result;
  }

  /**
   * Create a deep copy of a JSON object.
   */
  function deepObjectCopy(value: any): any {
    let result: any = {};
    for (let key in value) {
      // Ignore undefined values.
      let subvalue = value[key];
      if (subvalue === undefined) {
        continue;
      }
      result[key] = deepCopy(subvalue);
    }
    return result;
  }
}
