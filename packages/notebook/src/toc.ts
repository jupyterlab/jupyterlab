// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell, CodeCell, ICellModel, MarkdownCell } from '@jupyterlab/cells';
import { IMarkdownParser, IRenderMime } from '@jupyterlab/rendermime';
import {
  TableOfContents,
  TableOfContentsFactory,
  TableOfContentsModel,
  TableOfContentsUtils
} from '@jupyterlab/toc';
import { KernelError, NotebookActions } from './actions';
import { NotebookPanel } from './panel';
import { INotebookTracker } from './tokens';
import { Notebook } from './widget';

/**
 * Cell running status
 */
export enum RunningStatus {
  /**
   * Cell is idle
   */
  Idle = -1,
  /**
   * Cell execution is unsuccessful
   */
  Error = -0.5,
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
export interface INotebookHeading extends TableOfContents.IHeading {
  /**
   * Reference to a notebook cell.
   */
  cellRef: Cell;

  /**
   * Running status of the cells in the heading
   */
  isRunning: RunningStatus;

  /**
   * Index of the output containing the heading
   */
  outputIndex?: number;

  /**
   * Type of heading
   */
  type: Cell.HeadingType;
}

/**
 * Table of content model for Notebook files.
 */
export class NotebookToCModel extends TableOfContentsModel<
  INotebookHeading,
  NotebookPanel
> {
  /**
   * Constructor
   *
   * @param widget The widget to search in
   * @param parser Markdown parser
   * @param sanitizer Sanitizer
   * @param configuration Default model configuration
   */
  constructor(
    widget: NotebookPanel,
    protected parser: IMarkdownParser | null,
    protected sanitizer: IRenderMime.ISanitizer,
    configuration?: TableOfContents.IConfig
  ) {
    super(widget, configuration);
    this._runningCells = new Array<Cell>();
    this._errorCells = new Array<Cell>();
    this._cellToHeadingIndex = new WeakMap<Cell, number>();

    void widget.context.ready.then(() => {
      // Load configuration from metadata
      this.setConfiguration({});
    });

    this.widget.context.model.metadataChanged.connect(
      this.onMetadataChanged,
      this
    );
    this.widget.content.activeCellChanged.connect(
      this.onActiveCellChanged,
      this
    );
    NotebookActions.executionScheduled.connect(this.onExecutionScheduled, this);
    NotebookActions.executed.connect(this.onExecuted, this);
    NotebookActions.outputCleared.connect(this.onOutputCleared, this);
    this.headingsChanged.connect(this.onHeadingsChanged, this);
  }

  /**
   * Type of document supported by the model.
   *
   * #### Notes
   * A `data-document-type` attribute with this value will be set
   * on the tree view `.jp-TableOfContents-content[data-document-type="..."]`
   */
  get documentType(): string {
    return 'notebook';
  }

  /**
   * Whether the model gets updated even if the table of contents panel
   * is hidden or not.
   */
  protected get isAlwaysActive(): boolean {
    return true;
  }

  /**
   * List of configuration options supported by the model.
   */
  get supportedOptions(): (keyof TableOfContents.IConfig)[] {
    return [
      'baseNumbering',
      'maximalDepth',
      'numberingH1',
      'numberHeaders',
      'includeOutput',
      'syncCollapseState'
    ];
  }

  /**
   * Get the headings of a given cell.
   *
   * @param cell Cell
   * @returns The associated headings
   */
  getCellHeadings(cell: Cell): INotebookHeading[] {
    const headings = new Array<INotebookHeading>();
    let headingIndex = this._cellToHeadingIndex.get(cell);

    if (headingIndex !== undefined) {
      const candidate = this.headings[headingIndex];
      headings.push(candidate);
      while (
        this.headings[headingIndex - 1] &&
        this.headings[headingIndex - 1].cellRef === candidate.cellRef
      ) {
        headingIndex--;
        headings.unshift(this.headings[headingIndex]);
      }
    }

    return headings;
  }

  /**
   * Dispose the object
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.headingsChanged.disconnect(this.onHeadingsChanged, this);
    this.widget.context?.model?.metadataChanged.disconnect(
      this.onMetadataChanged,
      this
    );
    this.widget.content?.activeCellChanged.disconnect(
      this.onActiveCellChanged,
      this
    );
    NotebookActions.executionScheduled.disconnect(
      this.onExecutionScheduled,
      this
    );
    NotebookActions.executed.disconnect(this.onExecuted, this);
    NotebookActions.outputCleared.disconnect(this.onOutputCleared, this);

    this._runningCells.length = 0;
    this._errorCells.length = 0;

    super.dispose();
  }

  /**
   * Model configuration setter.
   *
   * @param c New configuration
   */
  setConfiguration(c: Partial<TableOfContents.IConfig>): void {
    // Ensure configuration update
    const metadataConfig = this.loadConfigurationFromMetadata();
    super.setConfiguration({ ...this.configuration, ...metadataConfig, ...c });
  }

  /**
   * Callback on heading collapse.
   *
   * @param options.heading The heading to change state (all headings if not provided)
   * @param options.collapsed The new collapsed status (toggle existing status if not provided)
   */
  toggleCollapse(options: {
    heading?: INotebookHeading;
    collapsed?: boolean;
  }): void {
    super.toggleCollapse(options);
    this.updateRunningStatus(this.headings);
  }

  /**
   * Produce the headings for a document.
   *
   * @returns The list of new headings or `null` if nothing needs to be updated.
   */
  protected getHeadings(): Promise<INotebookHeading[] | null> {
    const cells = this.widget.content.widgets;
    const headings: INotebookHeading[] = [];
    const documentLevels = new Array<number>();

    // Generate headings by iterating through all notebook cells...
    for (let i = 0; i < cells.length; i++) {
      const cell: Cell = cells[i];
      const model = cell.model;

      switch (model.type) {
        case 'code': {
          // Collapsing cells is incompatible with output headings
          if (
            !this.configuration.syncCollapseState &&
            this.configuration.includeOutput
          ) {
            headings.push(
              ...TableOfContentsUtils.filterHeadings(
                cell.headings,
                this.configuration,
                documentLevels
              ).map(heading => {
                return {
                  ...heading,
                  cellRef: cell,
                  collapsed: false,
                  isRunning: RunningStatus.Idle
                };
              })
            );
          }

          break;
        }
        case 'markdown': {
          const cellHeadings = TableOfContentsUtils.filterHeadings(
            cell.headings,
            this.configuration,
            documentLevels
          ).map((heading, index) => {
            return {
              ...heading,
              cellRef: cell,
              collapsed: false,
              isRunning: RunningStatus.Idle
            };
          });
          // If there are multiple headings, only collapse the highest heading (i.e. minimal level)
          // consistent with the cell.headingInfo
          if (
            this.configuration.syncCollapseState &&
            (cell as MarkdownCell).headingCollapsed
          ) {
            const minLevel = Math.min(...cellHeadings.map(h => h.level));
            const minHeading = cellHeadings.find(h => h.level === minLevel);
            minHeading!.collapsed = (cell as MarkdownCell).headingCollapsed;
          }
          headings.push(...cellHeadings);
          break;
        }
      }

      if (headings.length > 0) {
        this._cellToHeadingIndex.set(cell, headings.length - 1);
      }
    }
    this.updateRunningStatus(headings);
    return Promise.resolve(headings);
  }

  /**
   * Test if two headings are equal or not.
   *
   * @param heading1 First heading
   * @param heading2 Second heading
   * @returns Whether the headings are equal.
   */
  protected override isHeadingEqual(
    heading1: INotebookHeading,
    heading2: INotebookHeading
  ): boolean {
    return (
      super.isHeadingEqual(heading1, heading2) &&
      heading1.cellRef === heading2.cellRef
    );
  }

  /**
   * Read table of content configuration from notebook metadata.
   *
   * @returns ToC configuration from metadata
   */
  protected loadConfigurationFromMetadata(): Partial<TableOfContents.IConfig> {
    const nbModel = this.widget.content.model;
    const newConfig: Partial<TableOfContents.IConfig> = {};

    if (nbModel) {
      for (const option in this.configMetadataMap) {
        const keys = this.configMetadataMap[option];
        for (const k of keys) {
          let key = k;
          const negate = key[0] === '!';
          if (negate) {
            key = key.slice(1);
          }

          const keyPath = key.split('/');
          let value = nbModel.getMetadata(keyPath[0]);
          for (let p = 1; p < keyPath.length; p++) {
            value = (value ?? {})[keyPath[p]];
          }

          if (value !== undefined) {
            if (typeof value === 'boolean' && negate) {
              value = !value;
            }
            newConfig[option] = value;
          }
        }
      }
    }
    return newConfig;
  }

  protected onActiveCellChanged(
    notebook: Notebook,
    cell: Cell<ICellModel>
  ): void {
    // Highlight the first title as active (if multiple titles are in the same cell)
    const activeHeading = this.getCellHeadings(cell)[0];
    this.setActiveHeading(activeHeading ?? null, false);
  }

  protected onHeadingsChanged(): void {
    if (this.widget.content.activeCell) {
      this.onActiveCellChanged(
        this.widget.content,
        this.widget.content.activeCell
      );
    }
  }

  protected onExecuted(
    _: unknown,
    args: {
      notebook: Notebook;
      cell: Cell;
      success: boolean;
      error: KernelError | null;
    }
  ): void {
    this._runningCells.forEach((cell, index) => {
      if (cell === args.cell) {
        this._runningCells.splice(index, 1);

        const headingIndex = this._cellToHeadingIndex.get(cell);
        if (headingIndex !== undefined) {
          const heading = this.headings[headingIndex];
          // when the execution is not successful but errorName is undefined,
          // the execution is interrupted by previous cells
          if (args.success || args.error?.errorName === undefined) {
            heading.isRunning = RunningStatus.Idle;
            return;
          }
          heading.isRunning = RunningStatus.Error;
          if (!this._errorCells.includes(cell)) {
            this._errorCells.push(cell);
          }
        }
      }
    });

    this.updateRunningStatus(this.headings);
    this.stateChanged.emit();
  }

  protected onExecutionScheduled(
    _: unknown,
    args: { notebook: Notebook; cell: Cell }
  ): void {
    if (!this._runningCells.includes(args.cell)) {
      this._runningCells.push(args.cell);
    }
    this._errorCells.forEach((cell, index) => {
      if (cell === args.cell) {
        this._errorCells.splice(index, 1);
      }
    });

    this.updateRunningStatus(this.headings);
    this.stateChanged.emit();
  }

  protected onOutputCleared(
    _: unknown,
    args: { notebook: Notebook; cell: Cell }
  ): void {
    this._errorCells.forEach((cell, index) => {
      if (cell === args.cell) {
        this._errorCells.splice(index, 1);

        const headingIndex = this._cellToHeadingIndex.get(cell);
        if (headingIndex !== undefined) {
          const heading = this.headings[headingIndex];
          heading.isRunning = RunningStatus.Idle;
        }
      }
    });
    this.updateRunningStatus(this.headings);
    this.stateChanged.emit();
  }

  protected onMetadataChanged(): void {
    this.setConfiguration({});
  }

  protected updateRunningStatus(headings: INotebookHeading[]): void {
    // Update isRunning
    this._runningCells.forEach((cell, index) => {
      const headingIndex = this._cellToHeadingIndex.get(cell);
      if (headingIndex !== undefined) {
        const heading = this.headings[headingIndex];
        // Running is prioritized over Scheduled, so if a heading is
        // running don't change status
        if (heading.isRunning !== RunningStatus.Running) {
          heading.isRunning =
            index > 0 ? RunningStatus.Scheduled : RunningStatus.Running;
        }
      }
    });

    this._errorCells.forEach((cell, index) => {
      const headingIndex = this._cellToHeadingIndex.get(cell);
      if (headingIndex !== undefined) {
        const heading = this.headings[headingIndex];
        // Running and Scheduled are prioritized over Error, so only if
        // a heading is idle will it be set to Error
        if (heading.isRunning === RunningStatus.Idle) {
          heading.isRunning = RunningStatus.Error;
        }
      }
    });

    let globalIndex = 0;
    while (globalIndex < headings.length) {
      const heading = headings[globalIndex];
      globalIndex++;
      if (heading.collapsed) {
        const maxIsRunning = Math.max(
          heading.isRunning,
          getMaxIsRunning(headings, heading.level)
        );
        heading.dataset = {
          ...heading.dataset,
          'data-running': maxIsRunning.toString()
        };
      } else {
        heading.dataset = {
          ...heading.dataset,
          'data-running': heading.isRunning.toString()
        };
      }
    }

    function getMaxIsRunning(
      headings: INotebookHeading[],
      collapsedLevel: number
    ): RunningStatus {
      let maxIsRunning = RunningStatus.Idle;

      while (globalIndex < headings.length) {
        const heading = headings[globalIndex];
        heading.dataset = {
          ...heading.dataset,
          'data-running': heading.isRunning.toString()
        };

        if (heading.level > collapsedLevel) {
          globalIndex++;
          maxIsRunning = Math.max(heading.isRunning, maxIsRunning);
          if (heading.collapsed) {
            maxIsRunning = Math.max(
              maxIsRunning,
              getMaxIsRunning(headings, heading.level)
            );
            heading.dataset = {
              ...heading.dataset,
              'data-running': maxIsRunning.toString()
            };
          }
        } else {
          break;
        }
      }

      return maxIsRunning;
    }
  }

  /**
   * Mapping between configuration options and notebook metadata.
   *
   * If it starts with `!`, the boolean value of the configuration option is
   * opposite to the one stored in metadata.
   * If it contains `/`, the metadata data is nested.
   */
  protected configMetadataMap: {
    [k: keyof TableOfContents.IConfig]: string[];
  } = {
    numberHeaders: ['toc-autonumbering', 'toc/number_sections'],
    numberingH1: ['!toc/skip_h1_title'],
    baseNumbering: ['toc/base_numbering']
  };

  private _runningCells: Cell[];
  private _errorCells: Cell[];
  private _cellToHeadingIndex: WeakMap<Cell, number>;
}

/**
 * Table of content model factory for Notebook files.
 */
export class NotebookToCFactory extends TableOfContentsFactory<NotebookPanel> {
  /**
   * Constructor
   *
   * @param tracker Widget tracker
   * @param parser Markdown parser
   * @param sanitizer Sanitizer
   */
  constructor(
    tracker: INotebookTracker,
    protected parser: IMarkdownParser | null,
    protected sanitizer: IRenderMime.ISanitizer
  ) {
    super(tracker);
  }

  /**
   * Whether to scroll the active heading to the top
   * of the document or not.
   */
  get scrollToTop(): boolean {
    return this._scrollToTop;
  }
  set scrollToTop(v: boolean) {
    this._scrollToTop = v;
  }

  /**
   * Create a new table of contents model for the widget
   *
   * @param widget - widget
   * @param configuration - Table of contents configuration
   * @returns The table of contents model
   */
  protected _createNew(
    widget: NotebookPanel,
    configuration?: TableOfContents.IConfig
  ): TableOfContentsModel<TableOfContents.IHeading, NotebookPanel> {
    const model = new NotebookToCModel(
      widget,
      this.parser,
      this.sanitizer,
      configuration
    );

    // Connect model signals to notebook panel

    let headingToElement = new WeakMap<INotebookHeading, Element | null>();

    const onActiveHeadingChanged = (
      model: NotebookToCModel,
      heading: INotebookHeading | null
    ) => {
      if (heading) {
        const onCellInViewport = async (cell: Cell): Promise<void> => {
          if (!cell.inViewport) {
            // Bail early
            return;
          }

          const el = headingToElement.get(heading);

          if (el) {
            if (this.scrollToTop) {
              el.scrollIntoView({ block: 'start' });
            } else {
              const widgetBox = widget.content.node.getBoundingClientRect();
              const elementBox = el.getBoundingClientRect();

              if (
                elementBox.top > widgetBox.bottom ||
                elementBox.bottom < widgetBox.top
              ) {
                el.scrollIntoView({ block: 'center' });
              }
            }
          } else {
            console.debug('scrolling to heading: using fallback strategy');
            await widget.content.scrollToItem(
              widget.content.activeCellIndex,
              this.scrollToTop ? 'start' : undefined,
              0
            );
          }
        };

        const cell = heading.cellRef;
        const cells = widget.content.widgets;
        const idx = cells.indexOf(cell);
        // Switch to command mode to avoid entering Markdown cell in edit mode
        // if the document was in edit mode
        if (cell.model.type == 'markdown' && widget.content.mode != 'command') {
          widget.content.mode = 'command';
        }

        widget.content.activeCellIndex = idx;

        if (cell.inViewport) {
          onCellInViewport(cell).catch(reason => {
            console.error(
              `Fail to scroll to cell to display the required heading (${reason}).`
            );
          });
        } else {
          widget.content
            .scrollToItem(idx, this.scrollToTop ? 'start' : undefined)
            .then(() => {
              return onCellInViewport(cell);
            })
            .catch(reason => {
              console.error(
                `Fail to scroll to cell to display the required heading (${reason}).`
              );
            });
        }
      }
    };

    const findHeadingElement = (cell: Cell): void => {
      model.getCellHeadings(cell).forEach(async heading => {
        const elementId = await getIdForHeading(
          heading,
          this.parser!,
          this.sanitizer
        );

        const selector = elementId
          ? `h${heading.level}[id="${CSS.escape(elementId)}"]`
          : `h${heading.level}`;

        if (heading.outputIndex !== undefined) {
          // Code cell
          headingToElement.set(
            heading,
            TableOfContentsUtils.addPrefix(
              (heading.cellRef as CodeCell).outputArea.widgets[
                heading.outputIndex
              ].node,
              selector,
              heading.prefix ?? ''
            )
          );
        } else {
          headingToElement.set(
            heading,
            TableOfContentsUtils.addPrefix(
              heading.cellRef.node,
              selector,
              heading.prefix ?? ''
            )
          );
        }
      });
    };

    const onHeadingsChanged = (model: NotebookToCModel) => {
      if (!this.parser) {
        return;
      }
      // Clear all numbering items
      TableOfContentsUtils.clearNumbering(widget.content.node);

      // Create a new mapping
      headingToElement = new WeakMap<INotebookHeading, Element | null>();

      widget.content.widgets.forEach(cell => {
        findHeadingElement(cell);
      });
    };

    const onHeadingCollapsed = (
      _: NotebookToCModel,
      heading: INotebookHeading | null
    ) => {
      if (model.configuration.syncCollapseState) {
        if (heading !== null) {
          const cell = heading.cellRef as MarkdownCell;
          if (cell.headingCollapsed !== (heading.collapsed ?? false)) {
            cell.headingCollapsed = heading.collapsed ?? false;
          }
        } else {
          const collapseState = model.headings[0]?.collapsed ?? false;
          widget.content.widgets.forEach(cell => {
            if (cell instanceof MarkdownCell) {
              if (cell.headingInfo.level >= 0) {
                cell.headingCollapsed = collapseState;
              }
            }
          });
        }
      }
    };
    const onCellCollapsed = (_: unknown, cell: MarkdownCell) => {
      if (model.configuration.syncCollapseState) {
        const h = model.getCellHeadings(cell)[0];
        if (h) {
          model.toggleCollapse({
            heading: h,
            collapsed: cell.headingCollapsed
          });
        }
      }
    };

    const onCellInViewportChanged = (_: unknown, cell: Cell) => {
      if (cell.inViewport) {
        findHeadingElement(cell);
      } else {
        // Needed to remove prefix in cell outputs
        TableOfContentsUtils.clearNumbering(cell.node);
      }
    };

    void widget.context.ready.then(() => {
      onHeadingsChanged(model);

      model.activeHeadingChanged.connect(onActiveHeadingChanged);
      model.headingsChanged.connect(onHeadingsChanged);
      model.collapseChanged.connect(onHeadingCollapsed);
      widget.content.cellCollapsed.connect(onCellCollapsed);
      widget.content.cellInViewportChanged.connect(onCellInViewportChanged);
      widget.disposed.connect(() => {
        model.activeHeadingChanged.disconnect(onActiveHeadingChanged);
        model.headingsChanged.disconnect(onHeadingsChanged);
        model.collapseChanged.disconnect(onHeadingCollapsed);
        widget.content.cellCollapsed.disconnect(onCellCollapsed);
        widget.content.cellInViewportChanged.disconnect(
          onCellInViewportChanged
        );
      });
    });

    return model;
  }

  private _scrollToTop: boolean = true;
}

/**
 * Get the element id for an heading
 * @param heading Heading
 * @param parser The markdownparser
 * @returns The element id
 */
export async function getIdForHeading(
  heading: INotebookHeading,
  parser: IRenderMime.IMarkdownParser,
  sanitizer: IRenderMime.ISanitizer
) {
  let elementId: string | null = null;
  if (heading.type === Cell.HeadingType.Markdown) {
    elementId = await TableOfContentsUtils.Markdown.getHeadingId(
      parser,
      // Type from TableOfContentsUtils.Markdown.IMarkdownHeading
      (heading as any).raw,
      heading.level,
      sanitizer
    );
  } else if (heading.type === Cell.HeadingType.HTML) {
    // Type from TableOfContentsUtils.IHTMLHeading
    elementId = (heading as any).id;
  }
  return elementId;
}
