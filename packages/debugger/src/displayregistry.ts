// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDebugger, IDebuggerDisplayRegistry } from './tokens';

/**
 * Interface for display providers that can format debugger source paths.
 */
export interface IDebuggerSourceDisplayProvider {
  /**
   * Whether this provider can handle the given debugger source.
   */
  canHandle(source: IDebugger.Source): boolean;

  /**
   * Return a user-facing display name for the given source.
   */
  getDisplayName(source: IDebugger.Source): string;
}

/**
 * Registry that holds display providers for different source types.
 */
export class DebuggerDisplayRegistry implements IDebuggerDisplayRegistry {
  /**
   * Register a display provider.
   *
   * @param provider source display providder to register.
   */
  register(provider: IDebuggerSourceDisplayProvider): void {
    this._providers.push(provider);
  }

  /**
   * Try all providers. If any returns something more meaningful than `source.path`,
   * use that. Otherwise, fall back to `source.path`.
   */
  getDisplayName(source: IDebugger.Source): string {
    const path = source.path ?? '';
    let index = path;

    for (const provider of this._providers) {
      if (!provider.canHandle(source)) {
        continue;
      }

      const name = provider.getDisplayName(source);

      // If provider returns something different or more descriptive than raw path
      if (name && name !== path) {
        index = name;
      }
    }

    return index;
  }

  private _providers: IDebuggerSourceDisplayProvider[] = [];
}
