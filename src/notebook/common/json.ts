// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * A type alias for a JSON primitive.
 */
export
type JSONPrimitive = boolean | number | string;


/**
 * A type alias for a JSON value.
 */
export
type JSONValue = JSONPrimitive | JSONObject | JSONArray;


/**
 * A type definition for a JSON object.
 */
export
interface JSONObject { [key: string]: JSONValue; }


/**
 * A type definition for a JSON array.
 */
export
interface JSONArray extends Array<JSONValue> { }


/**
 * Test whether a JSON value is a primitive.
 *
 * @param value - The JSON value of interest.
 *
 * @returns `true` if the value is a primitive or `null`,
 *   `false` otherwise.
 */
export
function isPrimitive(value: JSONValue): value is JSONPrimitive {
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
export
function isArray(value: JSONValue): value is JSONArray {
  return Array.isArray(value);
}


/**
 * Test whether a JSON value is an object.
 *
 * @param value - The JSON value of interest.
 *
 * @returns `true` if the value is a an object, `false` otherwise.
 */
export
function isObject(value: JSONValue): value is JSONObject {
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
export
function deepEqual(first: JSONValue, second: JSONValue): boolean {
  // Check referential and primitive equality first.
  if (first === second) {
    return true;
  }

  // If one is a primitive, the `===` check ruled out the other.
  if (isPrimitive(first) || isPrimitive(second)) {
    return false;
  }

  // Bail if either is `undefined`.
  if (!first || !second) {
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
    return Private.arrayEqual(first as JSONArray, second as JSONArray);
  }

  // At this point, they must both be objects.
  return Private.objectEqual(first as JSONObject, second as JSONObject);
}


/**
 * The namespace for the private module data.
 */
namespace Private {
  /**
   * Compare two JSON arrays for deep equality.
   */
  export
  function arrayEqual(first: JSONArray, second: JSONArray): boolean {
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
  export
  function objectEqual(first: JSONObject, second: JSONObject): boolean {
    // Get the keys for each object.
    let k1 = Object.keys(first);
    let k2 = Object.keys(second);

    // Test the keys for equal length.
    if (k1.length !== k2.length) {
      return false;
    }

    // Sort the keys for equivalent order.
    k1.sort();
    k2.sort();

    // Compare the keys for equality.
    for (let i = 0, n = k1.length; i < n; ++i) {
      if (k1[i] !== k2[i]) {
        return false;
      }
    }

    // Compare the values for equality.
    for (let i = 0, n = k1.length; i < n; ++i) {
      if (!deepEqual(first[k1[i]], second[k1[i]])) {
        return false;
      }
    }

    // At this point, the objects are equal.
    return true;
  }
}
