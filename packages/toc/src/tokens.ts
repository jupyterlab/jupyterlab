import { ToolbarRegistry } from '@jupyterlab/apputils';
import type { Cell } from '@jupyterlab/cells';
import { IObservableList } from '@jupyterlab/observables';
import type { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import type { VDomRenderer } from '@jupyterlab/ui-components';
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
   * @returns Table of contents model or undefined if not found
   */
  getModel(widget: Widget): TableOfContents.IModel | undefined;

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
 * Cell running status
 */
export enum RunningStatus {
  /**
   * Cell is idle
   */
  Idle = -1,
  /**
   * Cell execution is scheduled
   */
  Scheduled = 0,
  /**
   * Cell is running
   */
  Running = 1
}

/**
 * Interface describing a notebook cell heading.
 */
export interface INotebookHeading extends IHeading {
  /**
   * Heading type.
   */
  type: 'header' | 'markdown' | 'code';

  /**
   * Reference to a notebook cell.
   */
  cellRef: Cell;

  /**
   * Heading prompt.
   */
  prompt?: string;

  /**
   * Boolean indicating whether a heading has a child node.
   */
  hasChild?: boolean;

  /**
   * index of reference cell in the notebook
   */
  index: number;

  /**
   * Running status of the cells in the heading
   */
  isRunning: RunningStatus;
}

/**
 * Namespace for table of contents interface
 */
export namespace TableOfContents {
  /**
   * Interface for the arguments needed in the collapse signal of a generator
   */
  export interface ICollapseChangedArgs {
    /**
     * Whether the given heading is collapsed in the table of contents or not
     */
    collapsed: boolean;

    /**
     * Targeted heading
     */
    heading: IHeading;
  }

  export interface IFactory<W extends Widget = Widget> {
    /**
     * Whether the factory can handle the widget or not.
     *
     * @param widget - widget
     * @returns boolean indicating a ToC can be generated
     */
    isApplicable: (widget: W) => boolean;

    createNew: (widget: W) => IModel;
  }

  /**
   * Interface describing a widget table of contents model.
   */
  export interface IModel extends VDomRenderer.IModel {
    activeHeading: IHeading | null;

    toggleCollapse: (heading: IHeading) => void;

    title?: string;

    /**
     * Signal to indicate that a collapse event happened.
     */
    collapseChanged?: ISignal<IModel, ICollapseChangedArgs>;

    /**
     * Returns the list of headings.
     *
     * @returns list of headings
     */
    readonly headings: IHeading[];

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

  /**
   * Interface describing table of contents widget options.
   */
  export interface IOptions {
    model?: IModel;

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
