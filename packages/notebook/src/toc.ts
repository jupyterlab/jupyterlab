// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';
import {
  Cell,
  CodeCell,
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

export enum HeadingType {
  HTML,
  Markdown
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
  type: HeadingType;
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
                      isRunning: RunningStatus.Idle,
                      type: HeadingType.HTML
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
                      isRunning: RunningStatus.Idle,
                      type: HeadingType.Markdown
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
                isRunning: RunningStatus.Idle,
                type: HeadingType.Markdown
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
    const model = new NotebookToCModel(
      widget,
      this.parser,
      this.sanitizer,
      configuration
    );

    let headingToElement = new WeakMap<INotebookHeading, Element | null>();

    const onActiveHeadingChanged = (
      model: TableOfContentsModel<INotebookHeading, NotebookPanel>,
      heading: INotebookHeading | null
    ) => {
      if (heading) {
        const el = headingToElement.get(heading);

        if (el) {
          const widgetBox = widget.content.node.getBoundingClientRect();
          const elementBox = el.getBoundingClientRect();

          if (
            elementBox.top > widgetBox.bottom ||
            elementBox.bottom < widgetBox.top ||
            elementBox.left > widgetBox.right ||
            elementBox.right < widgetBox.left
          ) {
            el.scrollIntoView({ inline: 'center' });
          }
        }
      }
    };

    const onHeadingsChanged = (
      model: TableOfContentsModel<INotebookHeading, NotebookPanel>
    ) => {
      if (!this.parser) {
        return;
      }
      // Clear all numbering items
      ToCUtils.clearNumbering(widget.content.node);

      // Create a new mapping
      headingToElement = new WeakMap<INotebookHeading, Element | null>();
      model.headings.forEach(async heading => {
        let elementId: string | null = null;
        if (heading.type === HeadingType.Markdown) {
          elementId = await ToCUtils.Markdown.getHeadingId(
            this.parser!,
            // Type from ToCUtils.Markdown.IMarkdownHeading
            (heading as any).raw,
            heading.level
          );
        } else if (heading.type === HeadingType.HTML) {
          // Type from ToCUtils.IHTMLHeading
          elementId = (heading as any).id;
        }

        const selector = elementId
          ? `h${heading.level}[id="${elementId}"]`
          : `h${heading.level}`;

        if (heading.outputIndex !== undefined) {
          // Code cell
          headingToElement.set(
            heading,
            ToCUtils.addPrefix(
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
            ToCUtils.addPrefix(
              heading.cellRef.node,
              selector,
              heading.prefix ?? ''
            )
          );
        }
      });
    };

    widget.context.ready.then(() => {
      onHeadingsChanged(model);

      model.activeHeadingChanged.connect(onActiveHeadingChanged);
      model.headingsChanged.connect(onHeadingsChanged);
      widget.disposed.connect(() => {
        model.activeHeadingChanged.disconnect(onActiveHeadingChanged);
        model.headingsChanged.disconnect(onHeadingsChanged);
      });
    });

    return model;
  }
}
