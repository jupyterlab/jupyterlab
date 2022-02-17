// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { ITableOfContentsRegistry } from './tokens';

/**
 * Class for registering widgets for which we can generate a table of contents.
 */
export class TableOfContentsRegistry implements ITableOfContentsRegistry {
  /**
   * Finds a table of contents generator for a widget.
   *
   * ## Notes
   *
   * -   If unable to find a table of contents generator, the method return `undefined`.
   *
   * @param widget - widget
   * @returns table of contents generator
   */
  find(widget: Widget): ITableOfContentsRegistry.IGenerator | undefined {
    for (let i = 0; i < this._generators.length; i++) {
      const gen = this._generators[i];
      if (gen.tracker.has(widget)) {
        if (gen.isEnabled && !gen.isEnabled(widget)) {
          continue;
        }
        return gen;
      }
    }
  }

  /**
   * Adds a table of contents generator to the registry.
   *
   * @param generator - table of contents generator
   */
  add(generator: ITableOfContentsRegistry.IGenerator): void {
    if (generator.collapseChanged) {
      // If there is a collapseChanged for a given generator, propagate the arguments through the registry's signal
      generator.collapseChanged.connect(
        (
          sender: ITableOfContentsRegistry.IGenerator<Widget>,
          args: ITableOfContentsRegistry.ICollapseChangedArgs
        ) => {
          this._collapseChanged.emit(args);
        }
      );
    }
    this._generators.push(generator);
  }

  get collapseChanged(): ISignal<
    this,
    ITableOfContentsRegistry.ICollapseChangedArgs
  > {
    return this._collapseChanged;
  }

  private _collapseChanged: Signal<
    this,
    ITableOfContentsRegistry.ICollapseChangedArgs
  > = new Signal<this, ITableOfContentsRegistry.ICollapseChangedArgs>(this);
  private _generators: ITableOfContentsRegistry.IGenerator[] = [];
}
