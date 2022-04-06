// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';
import {
  Cell,
  CodeCellModel,
  ICellModel,
  MARKDOWN_HEADING_COLLAPSED
} from '@jupyterlab/cells';
import { IMarkdownParser } from '@jupyterlab/rendermime';
import {
  TableOfContents,
  TableOfContentsFactory,
  TableOfContentsModel,
  ToCUtils
} from '@jupyterlab/toc';
import { NotebookActions } from './actions';
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
   * Boolean indicating whether a heading has a child node.
   */
  hasChild?: boolean;

  /**
   * index of reference cell in the notebook
   */
  index: number[];

  /**
   * Running status of the cells in the heading
   */
  isRunning: RunningStatus;
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
    protected sanitizer: ISanitizer,
    configuration?: TableOfContents.IConfig
  ) {
    super(widget, configuration);
    this._runningCells = new Array<Cell>();
    this._cellToHeadingIndex = new WeakMap<Cell, number>();

    this.widget.content.activeCellChanged.connect(
      this.onActiveCellChanged,
      this
    );
    NotebookActions.executionScheduled.connect(this.onExecutionScheduled, this);
    NotebookActions.executed.connect(this.onExecuted, this);
  }

  /**
   * Whether the model gets updated even if the table of contents panel
   * is hidden or not.
   */
  protected get isAlwaysActive(): boolean {
    return true;
  }

  /**
   * Dispose the object
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this._runningCells.length = 0;
    this.widget.content.activeCellChanged.disconnect(
      this.onActiveCellChanged,
      this
    );
    NotebookActions.executionScheduled.disconnect(
      this.onExecutionScheduled,
      this
    );
    NotebookActions.executed.disconnect(this.onExecuted, this);

    super.dispose();
  }

  /**
   * Callback on heading collapse.
   */
  toggleCollapse(heading: INotebookHeading): void {
    super.toggleCollapse(heading);
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
      const cellCollapseMetadata = this.configuration.syncCollapseState
        ? MARKDOWN_HEADING_COLLAPSED
        : 'toc-hr-collapsed';
      const collapsed =
        (model.metadata.get(cellCollapseMetadata) as boolean) ?? false;

      switch (model.type) {
        case 'code': {
          if (this.configuration.includeOutput) {
            // Iterate over the code cell outputs to check for Markdown or HTML from which we can generate ToC headings...
            const outputs = (model as CodeCellModel).outputs;
            for (let j = 0; j < outputs.length; j++) {
              const m = outputs.get(j);

              let htmlType: string | null = null;
              let mdType: string | null = null;

              Object.keys(m.data).forEach(t => {
                if (!mdType && ToCUtils.Markdown.isMarkdown(t)) {
                  mdType = t;
                } else if (!htmlType && ToCUtils.isHTML(t)) {
                  htmlType = t;
                }
              });

              // Parse HTML output only if trusted
              if (model.trusted && htmlType) {
                headings.push(
                  ...ToCUtils.getHTMLHeadings(
                    this.sanitizer.sanitize(m.data[htmlType] as string),
                    this.configuration,
                    documentLevels
                  ).map(heading => {
                    return {
                      ...heading,
                      cellRef: cell,
                      index: [i, j],
                      collapsed,
                      isRunning: RunningStatus.Idle
                    };
                  })
                );
              } else if (mdType) {
                headings.push(
                  ...ToCUtils.Markdown.getHeadings(
                    m.data[mdType] as string,
                    this.configuration,
                    documentLevels
                  ).map(heading => {
                    return {
                      ...heading,
                      cellRef: cell,
                      index: [i, j],
                      collapsed,
                      isRunning: RunningStatus.Idle
                    };
                  })
                );
              }
            }
          }

          break;
        }
        case 'markdown': {
          headings.push(
            ...ToCUtils.Markdown.getHeadings(
              cell.model.value.text,
              this.configuration,
              documentLevels
            ).map(heading => {
              return {
                ...heading,
                cellRef: cell,
                index: [i, 0],
                collapsed,
                isRunning: RunningStatus.Idle
              };
            })
          );
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

  protected onActiveCellChanged(
    notebook: Notebook,
    cell: Cell<ICellModel>
  ): void {
    let activeHeadingIndex = this._cellToHeadingIndex.get(cell);

    if (activeHeadingIndex !== undefined) {
      const candidate = this.headings[activeHeadingIndex];
      // Highlight the first title as active (if multiple titles are in the same cell)
      while (
        this.headings[activeHeadingIndex - 1] &&
        this.headings[activeHeadingIndex - 1].cellRef === candidate.cellRef
      ) {
        activeHeadingIndex--;
      }
      this.activeHeading = this.headings[activeHeadingIndex];
    } else {
      this.activeHeading = null;
    }
  }

  protected onExecuted(
    _: unknown,
    args: { notebook: Notebook; cell: Cell }
  ): void {
    this._runningCells.forEach((cell, index) => {
      if (cell === args.cell) {
        this._runningCells.splice(index, 1);

        const headingIndex = this._cellToHeadingIndex.get(cell);
        if (headingIndex) {
          const heading = this.headings[headingIndex];
          heading.isRunning = RunningStatus.Idle;
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

    this.updateRunningStatus(this.headings);
    this.stateChanged.emit();
  }

  protected updateRunningStatus(headings: INotebookHeading[]): void {
    // Update isRunning
    this._runningCells.forEach((cell, index) => {
      const headingIndex = this._cellToHeadingIndex.get(cell);
      if (headingIndex) {
        const heading = this.headings[headingIndex];
        heading.isRunning = Math.max(
          index > 0 ? RunningStatus.Scheduled : RunningStatus.Running,
          heading.isRunning
        );
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

  private _runningCells: Cell[];
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
    protected sanitizer: ISanitizer
  ) {
    super(tracker);
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
    return new NotebookToCModel(
      widget,
      this.parser,
      this.sanitizer,
      configuration
    );
  }
}
