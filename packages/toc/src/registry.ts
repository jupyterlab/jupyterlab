// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';

import { Token } from '@phosphor/coreutils';

import { Widget } from '@phosphor/widgets';

import { IHeading } from './toc';

/**
 * An interface for a TableOfContentsRegistry.
 */
export interface ITableOfContentsRegistry extends TableOfContentsRegistry {}

/* tslint:disable */
/**
 * The TableOfContentsRegistry token.
 */
export const ITableOfContentsRegistry = new Token<TableOfContentsRegistry>(
  'jupyterlab-toc:ITableOfContentsRegistry'
);
/* tslint:enable */

/**
 * A class that keeps track of the different kinds
 * of widgets for which there can be tables-of-contents.
 */
export class TableOfContentsRegistry {
  /**
   * Given a widget, find an IGenerator for it,
   * or undefined if none can be found.
   */
  findGeneratorForWidget(
    widget: Widget
  ): TableOfContentsRegistry.IGenerator | undefined {
    let generator: TableOfContentsRegistry.IGenerator | undefined;
    this._generators.forEach(gen => {
      if (gen.tracker.has(widget)) {
        // If isEnabled is present, check for it.
        if (gen.isEnabled && !gen.isEnabled(widget)) {
          return;
        }
        generator = gen;
      }
    });
    return generator;
  }

  /**
   * Add a new IGenerator to the registry.
   */
  addGenerator(generator: TableOfContentsRegistry.IGenerator): void {
    this._generators.push(generator);
  }

  private _generators: TableOfContentsRegistry.IGenerator[] = [];
}

/**
 * A namespace for TableOfContentsRegistry statics.
 */
export namespace TableOfContentsRegistry {
  /**
   * An interface for an object that knows how to generate a table-of-contents
   * for a type of widget.
   */

  export abstract class IGeneratorOptionsManager {}

  export interface IGenerator<W extends Widget = Widget> {
    /**
     * An instance tracker for the widget.
     */
    tracker: IWidgetTracker<W>;

    /**
     * A function to test whether to generate a ToC for a widget.
     *
     * #### Notes
     * By default is assumed to be enabled if the widget
     * is hosted in `tracker`. However, the user may want to add
     * additional checks. For instance, this can be used to generate
     * a ToC for text files only if they have a given mimeType.
     */
    isEnabled?: (widget: W) => boolean;

    /**
     * Whether the document uses LaTeX typesetting.
     *
     * Defaults to `false`.
     */
    usesLatex?: boolean;

    /**
     * An object that manage user settings for the generator.
     *
     * Defaults to `undefined`.
     */
    options?: IGeneratorOptionsManager;

    /**
     * A function that generates JSX element for each heading
     *
     * If not given, the default renderer will be used, which renders the text
     */
    itemRenderer?: (item: IHeading) => JSX.Element | null;

    /**
     * A function that generates a toolbar for the generator
     *
     * If not given, no toolbar will show up
     */
    toolbarGenerator?: () => any;

    /**
     * A function that takes the widget, and produces
     * a list of headings.
     */
    generate(widget: W): IHeading[];
  }
}
