// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * A generic interface for change emitter payloads.
 */
export interface IChangedArgs<T, OldT = T, U extends string = string> {
  /**
   * The name of the changed attribute.
   */
  name: U;

  /**
   * The old value of the changed attribute.
   */
  oldValue: OldT;

  /**
   * The new value of the changed attribute.
   */
  newValue: T;
}
