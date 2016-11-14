// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.



/**
 * An interface for session persistent state.
 */
export
interface IState {
  /**
   * Add a value to a given state.
   *
   * @param key - The state namespace.
   *
   * @param value - The value to add to the state.
   */
  addValue(key: string, value: JSONObject): void;

  /**
   * Remove a value to a given state.
   *
   * @param key - The state namespace.
   *
   * @param value - The value to remove from the state.
   */
  removeValue(key: string, value: JSONObject): void;

  /**
   * Get an iterator over that values in given state.
   *
   * @param key - The state namespace.
   *
   * @returns A new iterator over the state values.
   */
  getValues(key: string): IIterator<JSONObject>;
}


export
class State implements IState {
  /**
   * Add a value to a given state.
   *
   * @param key - The state namespace.
   *
   * @param value - The value to add to the state.
   */
  addValue(key: string, value: JSONObject): void {
    if (!key in this._state) {
      this._state[key] = [];
    }
    if (value in this._state[key]) {
      return;
    }
    this._state[key].push(value);
    window.sessionStorage.setItem(key, JSON.stringify(this._state[key]);
  }

  /**
   * Remove a value to a given state.
   *
   * @param key - The state namespace.
   *
   * @param value - The value to remove from the state.
   */
  removeValue(key: string, value: JSONObject): void;

  /**
   * Get an iterator over that values in given state.
   *
   * @param key - The state namespace.
   *
   * @returns A new iterator over the state values.
   */
  getValues(key: string): IIterator<JSONObject>;
}
