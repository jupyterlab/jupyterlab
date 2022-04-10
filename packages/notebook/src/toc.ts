// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';
import {
  Cell,
  CodeCell,
  CodeCellModel,
  ICellModel,
  MarkdownCell
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

    void widget.context.ready.then(() => {
      // Load configuration from metadata
      this.setConfiguration({});
    });

    this.widget.context.model.metadata.changed.connect(
      this.onMetadataChanged,
      this
    );
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
   * Get the first heading of a given cell.
   *
   * It will be `null` if the cell has no headings.
   *
   * @param cell Cell
   * @returns The associated heading
   */
  getCellHeading(cell: Cell): INotebookHeading | null {
    let headingIndex = this._cellToHeadingIndex.get(cell);

    if (headingIndex !== undefined) {
      const candidate = this.headings[headingIndex];
      // Highlight the first title as active (if multiple titles are in the same cell)
      while (
        this.headings[headingIndex - 1] &&
        this.headings[headingIndex - 1].cellRef === candidate.cellRef
      ) {
        headingIndex--;
      }
      return this.headings[headingIndex];
    } else {
      return null;
    }
  }

  /**
   * Dispose the object
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.widget.context.model.metadata.changed.disconnect(
      this.onMetadataChanged,
      this
    );
    this.widget.content.activeCellChanged.disconnect(
      this.onActiveCellChanged,
      this
    );
    NotebookActions.executionScheduled.disconnect(
      this.onExecutionScheduled,
      this
    );
    NotebookActions.executed.disconnect(this.onExecuted, this);

    this._runningCells.length = 0;

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

      switch (model.type) {
        case 'code': {
          // Collapsing cells is incompatible with output headings
          if (
            !this.configuration.syncCollapseState &&
            this.configuration.includeOutput
          ) {
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
              if (htmlType) {
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
                      collapsed: false,
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
                      collapsed: false,
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
            ).map((heading, index) => {
              return {
                ...heading,
                cellRef: cell,
                index: [i, 0],
                collapsed:
                  // If there are multiple headings, only collapse the first one
                  this.configuration.syncCollapseState && index === 0
                    ? (cell as MarkdownCell).headingCollapsed
                    : false,
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
          let value = nbModel.metadata.get(keyPath[0]) as any;
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

  protected onMetadataChanged(): void {
    this.setConfiguration({});
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

    // Connect model signals to notebook panel

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

    const onHeadingCollapsed = (
      _: NotebookToCModel,
      heading: INotebookHeading
    ) => {
      const cell = heading.cellRef as MarkdownCell;
      if (
        model.configuration.syncCollapseState &&
        cell.headingCollapsed !== (heading.collapsed ?? false)
      ) {
        cell.headingCollapsed = heading.collapsed ?? false;
      }
    };
    const onCellCollapsed = (_: unknown, cell: MarkdownCell) => {
      if (model.configuration.syncCollapseState) {
        const h = model.getCellHeading(cell);
        if (
          typeof h?.collapsed === 'boolean' &&
          h.collapsed !== cell.headingCollapsed
        ) {
          model.toggleCollapse(h);
        }
      }
    };

    widget.context.ready.then(() => {
      onHeadingsChanged(model);

      model.activeHeadingChanged.connect(onActiveHeadingChanged);
      model.headingsChanged.connect(onHeadingsChanged);
      model.collapseChanged.connect(onHeadingCollapsed);
      widget.content.cellCollapsed.connect(onCellCollapsed);
      // widget.content.
      widget.disposed.connect(() => {
        model.activeHeadingChanged.disconnect(onActiveHeadingChanged);
        model.headingsChanged.disconnect(onHeadingsChanged);
        model.collapseChanged.disconnect(onHeadingCollapsed);
        widget.content.cellCollapsed.disconnect(onCellCollapsed);
      });
    });

    return model;
  }
}
