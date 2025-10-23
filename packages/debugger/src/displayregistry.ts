// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDebugger } from './tokens';

/**
 * Interface for display providers that can format debugger source paths.
 */
export interface IDebuggerSourceDisplayProvider {
  canHandle(source: IDebugger.Source): boolean;
  getDisplayName(source: IDebugger.Source): string;
}

/**
 * Registry that holds display providers for different source types.
 */
export class DebuggerDisplayRegistry {
  private _providers: IDebuggerSourceDisplayProvider[] = [];

  register(provider: IDebuggerSourceDisplayProvider): void {
    this._providers.push(provider);
  }

  getDisplayName(source: IDebugger.Source): string {
    for (const provider of this._providers) {
      if (provider.canHandle(source)) {
        return provider.getDisplayName(source);
      }
    }
    console.log(source.path);

    return source.path ?? '';
  }
}
