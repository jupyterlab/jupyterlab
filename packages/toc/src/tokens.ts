import { IWidgetTracker } from '@jupyterlab/apputils';
import type { Cell } from '@jupyterlab/cells';
import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

/**
 * Interface describing the table of contents registry.
 */
export interface ITableOfContentsRegistry {
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
  find(widget: Widget): ITableOfContentsRegistry.IGenerator | undefined;

  /**
   * Adds a table of contents generator to the registry.
   *
   * @param generator - table of contents generator
   */
  add(generator: ITableOfContentsRegistry.IGenerator): void;

  /**
   * Signal emitted when a table of content section collapse state changes.
   */
  readonly collapseChanged: ISignal<
    this,
    ITableOfContentsRegistry.ICollapseChangedArgs
  >;
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
   * Callback invoked upon clicking a ToC item.
   *
   * ## Notes
   *
   * -   This will typically be used to scroll the parent widget to this item.
   */
  onClick: () => void;

  /**
   * Special HTML markup.
   *
   * ## Notes
   *
   * -   The HTML string **should** be properly **sanitized**!
   * -   The HTML string can be used to render Markdown headings which have already been rendered as HTML.
   */
  html?: string;
}

/**
 * Interface describing a numbered heading.
 */
export interface INumberedHeading extends IHeading {
  /**
   * Heading numbering.
   */
  numbering?: string | null;
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
export interface INotebookHeading extends INumberedHeading {
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
export namespace ITableOfContentsRegistry {
  /**
   * Interface for managing options affecting how a table of contents is generated for a particular widget type.
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
