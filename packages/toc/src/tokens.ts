// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ToolbarRegistry } from '@jupyterlab/apputils';
import type { IObservableList } from '@jupyterlab/observables';
import type { VDomRenderer } from '@jupyterlab/ui-components';
import type { JSONObject } from '@lumino/coreutils';
import { Token } from '@lumino/coreutils';
import type { IDisposable } from '@lumino/disposable';
import type { ISignal } from '@lumino/signaling';
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
 * Interface for the table of contents tracker
 */
export interface ITableOfContentsTracker {
  /**
   * Get the model associated with a given widget.
   *
   * @param widget Widget
   */
  get(widget: Widget): TableOfContents.IModel<TableOfContents.IHeading> | null;
}

/**
 * Table of contents tracker token.
 */
export const ITableOfContentsTracker = new Token<ITableOfContentsTracker>(
  '@jupyterlab/toc:ITableOfContentsTracker'
);

/**
 * Namespace for table of contents interface
 */
export namespace TableOfContents {
  /**
   * Table of content model factory interface
   */
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
     * @returns The table of contents model
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
     * Base level for the highest headings
     */
    baseNumbering: number;
    /**
     * Maximal depth of headings to display
     */
    maximalDepth: number;
    /**
     * Whether to number first-level headings or not.
     */
    numberingH1: boolean;
    /**
     * Whether to number headings in document or not.
     */
    numberHeaders: boolean;
    /**
     * Whether to include cell outputs in headings or not.
     */
    includeOutput: boolean;
    /**
     * Whether to synchronize heading collapse state between the ToC and the document or not.
     */
    syncCollapseState: boolean;
  }

  /**
   * Default table of content configuration
   */
  export const defaultConfig: IConfig = {
    baseNumbering: 1,
    maximalDepth: 4,
    numberingH1: true,
    numberHeaders: false,
    includeOutput: true,
    syncCollapseState: false
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
     * Heading prefix.
     */
    prefix?: string | null;

    /**
     * Dataset to add to the item node
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
    /**
     * Active heading
     */
    activeHeading: H | null;

    /**
     * Signal emitted when the active heading changes.
     */
    readonly activeHeadingChanged: ISignal<IModel<H>, H | null>;

    /**
     * Signal emitted when a table of content section collapse state changes.
     */
    readonly collapseChanged: ISignal<IModel<H>, H>;

    /**
     * Model configuration
     */
    readonly configuration: IConfig;

    /**
     * Type of document supported by the model.
     *
     * #### Notes
     * A `data-document-type` attribute with this value will be set
     * on the tree view `.jp-TableOfContents-content[data-document-type="..."]`
     */
    readonly documentType: string;

    /**
     * Returns the list of headings.
     *
     * @returns list of headings
     */
    readonly headings: H[];

    /**
     * Signal emitted when the headings changes.
     */
    readonly headingsChanged: ISignal<IModel<H>, void>;

    /**
     * Whether the model needs to be kept up to date or not.
     *
     * ### Notes
     * This is set to `true` if the ToC panel is visible and
     * to `false` if it is hidden. But some models may require
     * to be always active; e.g. to add numbering in the document.
     */
    isActive: boolean;

    /**
     * Model configuration setter.
     *
     * @param c New configuration
     */
    setConfiguration(c: Partial<IConfig>): void;

    /**
     * List of configuration options supported by the model.
     */
    readonly supportedOptions: (keyof IConfig)[];

    /**
     * Document title
     */
    title?: string;

    /**
     * Callback on heading collapse.
     */
    toggleCollapse: (heading: H) => void;
  }

  /**
   * Generic table of contents type
   */
  export type Model = IModel<IHeading>;

  /**
   * Interface describing table of contents widget options.
   */
  export interface IOptions {
    /**
     * Table of contents model.
     */
    model?: IModel<IHeading>;
  }

  /**
   * Interface describing a toolbar item list
   */
  export interface IToolbarItems
    extends IObservableList<ToolbarRegistry.IToolbarItem> {}
}
