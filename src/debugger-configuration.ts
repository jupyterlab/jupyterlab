// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';

import { Signal } from '@lumino/signaling';

import { murmur2 } from 'murmurhash-js';

/**
 * A class that holds debugger configuration for a kernel.
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
      this._tmpFileAssociatedWithKernel.get(kernelName).tmpFilePrefix +
      this._hashMethod(code) +
      this._tmpFileAssociatedWithKernel.get(kernelName).tmpFileSuffix
    );
  }

  /**
   * Set the hash parameters for the current session.
   *
   * @param hashParams - Unified parameters for hash method
   */
  public setHashParameters(hashParams: IHashParameters): void {
    const { kernelName, hashMethod, hashSeed } = hashParams;
    if (kernelName === 'xpython') {
      if (hashMethod === 'Murmur2') {
        this._hashMethod = (code: string): string => {
          return murmur2(code, hashSeed).toString();
        };
      } else {
        throw new Error('hash method not supported ' + hashMethod);
      }
    } else {
      throw new Error('Kernel not supported ' + kernelName);
    }
  }

  /**
   * Set the parameters used for the temporary files (e.g. cells).
   *
   * @param fileParams - Unified parameters for mapping
   */
  public setTmpFileParameters(fileParams: ITmpFileParameters): void {
    const { kernelName, tmpFilePrefix, tmpFileSuffix } = fileParams;
    this._tmpFileAssociatedWithKernel.set(kernelName, {
      tmpFilePrefix,
      tmpFileSuffix
    });
  }

  private _hashMethod: (code: string) => string;
  private _tmpFileAssociatedWithKernel = new Map<string, IFileParameters>();
}

/**
 * Interface with unified parameters of method for mapping temporary file.
 *
 */
interface ITmpFileParameters extends IFileParameters {
  /**
   * Name of current kernel.
   */
  kernelName: string;
}

/**
 * Interface with prefix and suffix for map.
 */
interface IFileParameters {
  /**
   * Prefix of temporary file.
   */
  tmpFilePrefix: string;

  /**
   * Suffix of temporary file.
   */
  tmpFileSuffix: string;
}

/**
 * Interface with unified parameters of hashing method.
 */
interface IHashParameters {
  /**
   * Type of hash method.
   */
  hashMethod: string;

  /**
   * Hash seed
   */
  hashSeed: number;

  /**
   * Name of current kernel.
   */
  kernelName: string;
}

export const IDebuggerConfig = new Token<IDebuggerConfig>(
  '@jupyterlab/debugger:configuration'
);
/**
 * Interface for configuration plugin
 */
export interface IDebuggerConfig {
  setHashParameters(hashParams: IHashParameters): void;
  setTmpFileParameters(fileParams: ITmpFileParameters): void;
  getCodeId(code: string, kernelName: string): string;
}
