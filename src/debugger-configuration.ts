// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';

import { Signal } from '@lumino/signaling';

import { murmur2 } from 'murmurhash-js';

/**
 * A class to hash code.
 */
export class DebuggerConfiguration implements IDebuggerConfig {
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
   * @param kernelName The kernel name from current session.
   */
  public getCodeId(code: string, kernelName: string): string {
    return (
      this._tmpFileAssociatedWithKernel.get(kernelName)[0] +
      this._hashMethod(code) +
      this._tmpFileAssociatedWithKernel.get(kernelName)[1]
    );
  }

  /**
   * Set the hash parameters for the current session.
   *
   * @param method The hash method.
   * @param seed The seed for the hash method.
   * @param kernelName Kernel name for algorithm selection
   */
  public setHashParameters(
    method: string,
    seed: number,
    kernelName: string
  ): void {
    if (kernelName === 'xpython') {
      if (method === 'Murmur2') {
        this._hashMethod = (code: string): string => {
          return murmur2(code, seed).toString();
        };
      } else {
        throw new Error('hash method not supported ' + method);
      }
    } else {
      throw new Error('Kernel not supported ' + kernelName);
    }
  }

  /**
   * Set the parameters used for the temporary files (e.g. cells).
   *
   * @param prefix The prefix used for the temporary files.
   * @param suffix The suffix used for the temporary files.
   * @param kernelName The kernel name from current session.
   */
  public setTmpFileParameters(
    prefix: string,
    suffix: string,
    kernelName: string
  ): void {
    this._tmpFileAssociatedWithKernel.set(kernelName, [prefix, suffix]);
  }

  private _hashMethod: (code: string) => string;
  private _tmpFileAssociatedWithKernel = new Map<string, [string, string]>();
}

export const IDebuggerConfig = new Token<IDebuggerConfig>(
  '@jupyterlab/debugger:configuration'
);
/**
 * Interface for configuration plugin
 */
export interface IDebuggerConfig {
  setHashParameters(method: string, seed: number, kernelName: string): void;
  setTmpFileParameters(
    prefix: string,
    suffix: string,
    kernelName: string
  ): void;
  getCodeId(code: string, kernelName: string): string;
}
