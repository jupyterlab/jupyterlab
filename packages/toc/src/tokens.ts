// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ToolbarRegistry } from '@jupyterlab/apputils';
import type { IObservableList } from '@jupyterlab/observables';
import type { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import type { VDomRenderer } from '@jupyterlab/ui-components';
import type { JSONObject } from '@lumino/coreutils';
import { Token } from '@lumino/coreutils';
import type { IDisposable } from '@lumino/disposable';
import type { Widget } from '@lumino/widgets';

/**
 * Interface describing the table of contents registry.
 */
export interface ITableOfContentsRegistry {
  /**
   * Finds a table of contents model for a widget.
   *
   * ## Notes
   *
   * -   If unable to find a table of contents model, the method return `undefined`.
   *
   * @param widget - widget
   * @param configuration - Table of contents configuration
   * @returns Table of contents model or undefined if not found
   */
  getModel(
    widget: Widget,
    configuration?: TableOfContents.IConfig
  ): TableOfContents.Model | undefined;

  /**
   * Adds a table of contents factory to the registry.
   *
   * @param factory - table of contents factory
   */
  add(factory: TableOfContents.IFactory): IDisposable;
}

/**
 * Table of contents registry token.
 */
export const ITableOfContentsRegistry = new Token<ITableOfContentsRegistry>(
  '@jupyterlab/toc:ITableOfContentsRegistry'
);

/**
 * Namespace for table of contents interface
 */
export namespace TableOfContents {
  export interface IFactory<W extends Widget = Widget> {
    /**
     * Whether the factory can handle the widget or not.
     *
     * @param widget - widget
     * @returns boolean indicating a ToC can be generated
     */
    isApplicable: (widget: W) => boolean;

    /**
     * Create a new table of contents model for the widget
     *
     * @param widget - widget
     * @param configuration - Table of contents configuration
     * @returns The table of contens model
     */
    createNew: (
      widget: W,
      configuration?: TableOfContents.IConfig
    ) => IModel<IHeading>;
  }

  /**
   * Table of Contents configuration
   *
   * #### Notes
   * A document model may ignore some of those options.
   */
  export interface IConfig extends JSONObject {
    /**
     * Maximal depth of headings to display
     */
    maximalDepth: number;
    /**
     * Whether to number first-level headings or not.
     */
    numberingH1: boolean;
    /**
     * Whether to include cell outputs in headings or not.
     */
    includeOutputs: boolean;
    /**
     * Whether to synchronize heading collapse state between the ToC and the document or not.
     */
    synchronizeCollapseState: boolean;
  }

  export const defaultConfig: IConfig = {
    maximalDepth: 4,
    numberingH1: true,
    includeOutputs: true,
    synchronizeCollapseState: false
  };

  /**
   * Interface describing a heading.
   */
  export interface IHeading {
    /**
     * Heading text.
     */
    text: string;

    /**
     * HTML heading level.
     */
    level: number;

    /**
     * Special HTML markup.
     *
     * ## Notes
     *
     * -   The HTML string **should** be properly **sanitized**!
     * -   The HTML string can be used to render Markdown headings which have already been rendered as HTML.
     */
    html?: string;

    /**
     * Heading prefix.
     */
    prefix?: string | null;

    /**
     * Dataset to add to the outline item node
     */
    dataset?: Record<string, string>;

    /**
     * Whether the heading is collapsed or not
     */
    collapsed?: boolean;
  }

  /**
   * Interface describing a widget table of contents model.
   */
  export interface IModel<H extends IHeading> extends VDomRenderer.IModel {
    activeHeading: H | null;

    isActive: boolean;

    configuration: IConfig;

    /**
     * Returns the list of headings.
     *
     * @returns list of headings
     */
    readonly headings: H[];

    title?: string;

    toggleCollapse: (heading: H) => void;

    /**
     * Toolbar items for the table of contents.
     */
    readonly toolbarItems?: IToolbarItems;

    /**
     * Boolean indicating whether a document uses LaTeX typesetting.
     *
     * @default false
     */
    readonly usesLatex?: boolean;
  }

  export type Model = IModel<IHeading>;

  /**
   * Interface describing table of contents widget options.
   */
  export interface IOptions {
    model?: IModel<IHeading>;

    /**
     * Application rendered MIME type.
     */
    rendermime: IRenderMimeRegistry;
  }

  /**
   * Interface describing a toolbar item list
   */
  export interface IToolbarItems
    extends IObservableList<ToolbarRegistry.IToolbarItem> {}
}
