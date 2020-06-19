// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';

import { Signal } from '@lumino/signaling';

import { murmur2 } from 'murmurhash-js';

/**
 * A class to hash code.
 */
export class ParametersMixer implements IDebuggerParametersMixer {
  /**
   * Whether the handler is disposed.
   */
  isDisposed: boolean;

  /**
   * Dispose the objects.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Computes an id based on the given code.
   *
   * @param code The source code.
   */
  public getCodeId(code: string): string {
    return this._tmpFilePrefix + this._hashMethod(code) + this._tmpFileSuffix;
  }

  /**
   * Set the hash parameters for the current session.
   *
   * @param method The hash method.
   * @param seed The seed for the hash method.
   */
  public setHashParameters(method: string, seed: number): void {
    if (method === 'Murmur2') {
      this._hashMethod = (code: string): string => {
        return murmur2(code, seed).toString();
      };
    } else {
      throw new Error('hash method not supported ' + method);
    }
  }

  /**
   * Set the parameters used for the temporary files (e.g. cells).
   *
   * @param prefix The prefix used for the temporary files.
   * @param suffix The suffix used for the temporary files.
   */
  public setTmpFileParameters(prefix: string, suffix: string): void {
    this._tmpFilePrefix = prefix;
    this._tmpFileSuffix = suffix;
  }

  private _hashMethod: (code: string) => string;
  private _tmpFilePrefix: string;
  private _tmpFileSuffix: string;
}

export const IDebuggerParametersMixer = new Token<IDebuggerParametersMixer>(
  '@jupyterlab/debugger:parameters-mixer'
);
/**
 * Interface for parameters mixer plugin
 */
export interface IDebuggerParametersMixer {
  setHashParameters(method: string, seed: number): void;
  setTmpFileParameters(prefix: string, suffix: string): void;
  getCodeId(code: string): string;
}
