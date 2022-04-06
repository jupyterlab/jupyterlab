// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { Widget } from '@lumino/widgets';
import { ITableOfContentsRegistry, TableOfContents } from './tokens';

/**
 * Class for registering table of contents generators.
 */
export class TableOfContentsRegistry implements ITableOfContentsRegistry {
  /**
   * Finds a table of contents model for a widget.
   *
   * ## Notes
   *
   * -   If unable to find a table of contents model, the method return `undefined`.
   *
   * @param widget - widget
   * @param configuration - Default model configuration
   * @returns Table of contents model
   */
  getModel(
    widget: Widget,
    configuration?: TableOfContents.IConfig
  ): TableOfContents.Model | undefined {
    for (const generator of this._generators.values()) {
      if (generator.isApplicable(widget)) {
        return generator.createNew(widget, configuration);
      }
    }
  }

  /**
   * Adds a table of contents generator to the registry.
   *
   * @param generator - table of contents generator
   */
  add(generator: TableOfContents.IFactory): IDisposable {
    const id = this._idCounter++;
    this._generators.set(id, generator);

    return new DisposableDelegate(() => {
      this._generators.delete(id);
    });
  }

  private _generators = new Map<number, TableOfContents.IFactory>();
  private _idCounter = 0;
}
