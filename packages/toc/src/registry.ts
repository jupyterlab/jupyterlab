// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';
import { Token } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { IHeading, INotebookHeading } from './utils/headings';

/**
 * Interface describing the table of contents registry.
 *
 * @private
 */
export interface ITableOfContentsRegistry extends TableOfContentsRegistry {}

/* tslint:disable */
/**
 * Table of contents registry token.
 */
export const ITableOfContentsRegistry = new Token<TableOfContentsRegistry>(
  '@jupyterlab/toc:ITableOfContentsRegistry'
);
/* tslint:enable */

/**
 * Class for registering widgets for which we can generate a table of contents.
 */
export class TableOfContentsRegistry {
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
  find(widget: Widget): TableOfContentsRegistry.IGenerator | undefined {
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
  add(generator: TableOfContentsRegistry.IGenerator): void {
    if (generator.collapseChanged) {
      // If there is a collapseChanged for a given generator, propagate the arguments through the registry's signal
      generator.collapseChanged.connect(
        (
          sender: TableOfContentsRegistry.IGenerator<Widget>,
          args: TableOfContentsRegistry.ICollapseChangedArgs
        ) => {
          this._collapseChanged.emit(args);
        }
      );
    }
    this._generators.push(generator);
  }

  get collapseChanged(): ISignal<
    this,
    TableOfContentsRegistry.ICollapseChangedArgs
  > {
    return this._collapseChanged;
  }

  private _collapseChanged: Signal<
    this,
    TableOfContentsRegistry.ICollapseChangedArgs
  > = new Signal<this, TableOfContentsRegistry.ICollapseChangedArgs>(this);
  private _generators: TableOfContentsRegistry.IGenerator[] = [];
}

/**
 * Static registry methods.
 */
export namespace TableOfContentsRegistry {
  /**
   * Abstract class for managing options affecting how a table of contents is generated for a particular widget type.
   */
  export interface IOptionsManager {}

  /**
   * Interface for the arguments needed in the collapse signal of a generator
   */
  export interface ICollapseChangedArgs {
    /**
     * Boolean indicating whether the given heading is collapsed in ToC
     */
    collapsedState: boolean;

    /**
     * Heading that was involved in the collapse event
     */
    heading: IHeading;

    /**
     * Type of file that the given heading was produced from
     */
    tocType: string;
  }

  /**
   * Interface describing a widget table of contents generator.
   */
  export interface IGenerator<W extends Widget = Widget> {
    /**
     * Widget instance tracker.
     */
    tracker: IWidgetTracker<W>;

    /**
     * Returns a boolean indicating whether we can generate a ToC for a widget.
     *
     * ## Notes
     *
     * -   By default, we assume ToC generation is enabled if the widget is hosted in `tracker`.
     * -   However, a user may want to add additional checks (e.g., only generate a ToC for text files only if they have a given MIME type).
     *
     * @param widget - widget
     * @returns boolean indicating whether we can generate a ToC for a widget
     */
    isEnabled?: (widget: W) => boolean;

    /**
     * Boolean indicating whether a document uses LaTeX typesetting.
     *
     * @default false
     */
    usesLatex?: boolean;

    /**
     * Options manager.
     *
     * @default undefined
     */
    options?: IOptionsManager;

    /**
     * Signal to indicate that a collapse event happened to this heading
     * within the ToC.
     */
    collapseChanged?: ISignal<IOptionsManager, ICollapseChangedArgs>;

    /**
     * Returns a JSX element for each heading.
     *
     * ## Notes
     *
     * -   If not present, a default renderer will be used.
     *
     * @param item - heading
     * @param toc - list of headings
     * @returns JSX element
     */
    itemRenderer?: (
      item: IHeading,
      toc: INotebookHeading[]
    ) => JSX.Element | null;

    /**
     * Returns a toolbar component.
     *
     * ## Notes
     *
     * -   If not present, no toolbar is generated.
     *
     * @returns toolbar component
     */
    toolbarGenerator?: () => any;

    /**
     * Returns a list of headings.
     *
     * @param widget - widget
     * @returns list of headings
     */
    generate(widget: W, options?: IOptionsManager): IHeading[];
  }
}
