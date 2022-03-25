// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';
import {
  Cell,
  CodeCell,
  CodeCellModel,
  ICellModel,
  MARKDOWN_HEADING_COLLAPSED,
  MarkdownCell
} from '@jupyterlab/cells';
import {
  INotebookTracker,
  NotebookActions,
  NotebookPanel
} from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ISignal } from '@lumino/signaling';
import { TableOfContentsWidget } from '../../treeview';
import { INotebookHeading, RunningStatus, TableOfContents } from '../../tokens';
import { isDOM } from '../../utils/is_dom';
import { isMarkdown } from '../../utils/is_markdown';
import { appendHeading } from './append_heading';
import { appendMarkdownHeading } from './append_markdown_heading';
import { getCodeCellHeading } from './get_code_cell_heading';
import { getLastHeadingLevel } from './get_last_heading_level';
import { getMarkdownHeadings } from './get_markdown_heading';
import { getRenderedHTMLHeadings } from './get_rendered_html_heading';
import { OptionsManager } from './options_manager';
import { render } from './render';
import { toolbar } from './toolbar_generator';

/**
 * Returns a ToC generator for notebooks.
 *
 * @param tracker - notebook tracker
 * @param widget - table of contents widget
 * @param sanitizer - HTML sanitizer
 * @param translator - Language translator
 * @param settings - advanced settings for toc extension
 * @returns ToC generator capable of parsing notebooks
 */
export function createNotebookGenerator(
  tracker: INotebookTracker,
  widget: TableOfContentsWidget,
  sanitizer: ISanitizer,
  translator?: ITranslator,
  settings?: ISettingRegistry.ISettings
): TableOfContents.IModel<NotebookPanel> {
  return new NotebookGenerator(
    tracker,
    widget,
    sanitizer,
    translator,
    settings
  );
}

class NotebookGenerator implements TableOfContents.IModel<NotebookPanel> {
  /**
   * Notebook Table of Content Generator constructor
   *
   * @param tracker - notebook tracker
   * @param widget - table of contents widget
   * @param sanitizer - HTML sanitizer
   * @param translator - Language translator
   * @param settings - advanced settings for toc extension
   */
  constructor(
    tracker: INotebookTracker,
    widget: TableOfContentsWidget,
    sanitizer: ISanitizer,
    translator?: ITranslator,
    settings?: ISettingRegistry.ISettings
  ) {
    this.sanitizer = sanitizer;
    this.tracker = tracker;
    this.widget = widget;
    this._runningCells = new Array<Cell>();

    let numberingH1 = true;
    let includeOutput = true;
    let syncCollapseState = false;
    if (settings) {
      numberingH1 = settings.composite.numberingH1 as boolean;
      includeOutput = settings.composite.includeOutput as boolean;
      syncCollapseState = settings.composite.syncCollapseState as boolean;
    }
    const options = (this.options = new OptionsManager(widget, tracker, {
      numbering: false,
      numberingH1: numberingH1,
      includeOutput: includeOutput,
      syncCollapseState: syncCollapseState,
      sanitizer: sanitizer,
      translator: translator || nullTranslator
    }));
    if (settings) {
      settings.changed.connect(() => {
        options.numberingH1 = settings.composite.numberingH1 as boolean;
        options.includeOutput = settings.composite.includeOutput as boolean;
        options.syncCollapseState = settings.composite
          .syncCollapseState as boolean;
      });
    }
    tracker.activeCellChanged.connect(
      (sender: INotebookTracker, args: Cell<ICellModel>) => {
        widget.update();
      }
    );
    NotebookActions.executionScheduled.connect((_, args) => {
      if (!this._runningCells.includes(args.cell)) {
        this._runningCells.push(args.cell);
      }
    });
    NotebookActions.executed.connect((_, args) => {
      this._runningCells.forEach((cell, index) => {
        if (cell === args.cell) {
          this._runningCells.splice(index, 1);
        }
      });
    });
  }

  /**
   * Signal to indicate that a collapse event happened to this heading
   * within the ToC.
   */
  get collapseChanged(): ISignal<
    TableOfContents.IOptionsManager,
    TableOfContents.ICollapseChangedArgs
  > {
    return this.options.collapseChanged;
  }

  /**
   * Returns a toolbar generator.
   *
   * @returns toolbar generator
   */
  toolbarGenerator() {
    return toolbar(this.options, this.tracker);
  }

  /**
   * Renders a table of contents item.
   *
   * @param item - heading to render
   * @param toc - list of all headers to render
   * @returns rendered item
   */
  itemRenderer = (
    item: INotebookHeading,
    toc: INotebookHeading[] = []
  ): JSX.Element | null => {
    return render(this.options, this.tracker, this.widget, item, toc);
  };

  /**
   * Generates a table of contents.
   *
   * @param panel - notebook widget
   * @returns a list of headings
   */
  generate(panel: NotebookPanel): INotebookHeading[] {
    let headings: INotebookHeading[] = [];
    let collapseLevel = -1;
    let dict = {};

    // Initialize a variable for keeping track of the previous heading:
    let prev: INotebookHeading | null = null;

    // Generate headings by iterating through all notebook cells...
    for (let i = 0; i < panel.content.widgets.length; i++) {
      let cell: Cell = panel.content.widgets[i];
      let model = cell.model;
      let cellCollapseMetadata = this.options.syncCollapseState
        ? MARKDOWN_HEADING_COLLAPSED
        : 'toc-hr-collapsed';
      const collapsed =
        (model.metadata.get(cellCollapseMetadata) as boolean) ?? false;

      const isRunning = this._runningCells.includes(cell)
        ? this._runningCells[0] === cell
          ? RunningStatus.Running
          : RunningStatus.Scheduled
        : RunningStatus.Idle;

      switch (model.type) {
        case 'code': {
          if (!this.widget || (this.widget && this.options.showCode)) {
            const onClick = (line: number) => {
              return () => {
                panel.content.activeCellIndex = i;
                cell.node.scrollIntoView();
              };
            };
            const count = (cell as CodeCell).model.executionCount as
              | number
              | null;
            const executionIndicator =
              count ?? (isRunning !== RunningStatus.Idle ? '*' : ' ');
            let executionCount = `[${executionIndicator}]: `;
            let heading = getCodeCellHeading(
              (model as CodeCellModel).value.text,
              onClick,
              executionCount,
              getLastHeadingLevel(headings),
              cell,
              i,
              isRunning
            );
            [headings, prev] = appendHeading(
              headings,
              heading,
              prev,
              collapseLevel,
              this.options.filtered
            );
          }
          if (this.options.includeOutput) {
            // Iterate over the code cell outputs to check for Markdown or HTML from which we can generate ToC headings...
            for (let j = 0; j < (model as CodeCellModel).outputs.length; j++) {
              const m = (model as CodeCellModel).outputs.get(j);

              let dtypes = Object.keys(m.data);
              dtypes = dtypes.filter(t => isMarkdown(t) || isDOM(t));
              if (!dtypes.length) {
                continue;
              }
              const onClick = (el: Element) => {
                return () => {
                  panel.content.activeCellIndex = i;
                  panel.content.mode = 'command';
                  el.scrollIntoView();
                };
              };
              let htmlHeadings = getRenderedHTMLHeadings(
                (cell as CodeCell).outputArea.widgets[j].node,
                onClick,
                this.sanitizer,
                dict,
                getLastHeadingLevel(headings),
                this.options.numbering,
                this.options.numberingH1,
                cell,
                i,
                isRunning
              );
              for (const heading of htmlHeadings) {
                [headings, prev, collapseLevel] = appendMarkdownHeading(
                  heading,
                  headings,
                  prev,
                  collapseLevel,
                  this.options.filtered,
                  collapsed,
                  this.options.showMarkdown,
                  cellCollapseMetadata
                );
              }
            }
          }

          break;
        }
        case 'markdown': {
          let mcell = cell as MarkdownCell;
          let heading: INotebookHeading | undefined;
          let lastLevel = getLastHeadingLevel(headings);

          // If the cell is rendered, generate the ToC items from the HTML...
          if (mcell.rendered && !mcell.inputHidden) {
            const onClick = (el: Element) => {
              return () => {
                if (!mcell.rendered) {
                  panel.content.activeCellIndex = i;
                  el.scrollIntoView();
                } else {
                  panel.content.mode = 'command';
                  cell.node.scrollIntoView();
                  panel.content.activeCellIndex = i;
                }
              };
            };
            const htmlHeadings = getRenderedHTMLHeadings(
              cell.node,
              onClick,
              this.sanitizer,
              dict,
              lastLevel,
              this.options.numbering,
              this.options.numberingH1,
              cell,
              i,
              isRunning
            );
            for (heading of htmlHeadings) {
              [headings, prev, collapseLevel] = appendMarkdownHeading(
                heading,
                headings,
                prev,
                collapseLevel,
                this.options.filtered,
                collapsed,
                this.options.showMarkdown,
                cellCollapseMetadata
              );
            }
            // If not rendered, generate ToC items from the cell text...
          } else {
            const onClick = (line: number) => {
              return () => {
                panel.content.activeCellIndex = i;
                cell.node.scrollIntoView();
              };
            };
            const markdownHeadings = getMarkdownHeadings(
              model!.value.text,
              onClick,
              dict,
              lastLevel,
              cell,
              i,
              isRunning
            );
            for (heading of markdownHeadings) {
              [headings, prev, collapseLevel] = appendMarkdownHeading(
                heading,
                headings,
                prev,
                collapseLevel,
                this.options.filtered,
                collapsed,
                this.options.showMarkdown,
                cellCollapseMetadata
              );
            }
          }

          break;
        }
      }

      // Must be done afterwards as `heading.hasChild` needs to be up to date.
      const lastHeading = headings[headings.length - 1];
      if (lastHeading) {
        lastHeading.isRunning = Math.max(lastHeading.isRunning, isRunning);
      }
    }
    return headings;
  }

  /**
   * Boolean indicating whether a document uses LaTeX typesetting.
   */
  readonly usesLatex: true;
  /**
   * Options manager
   */
  readonly options: OptionsManager;
  /**
   * Widget instance tracker.
   */
  readonly tracker: INotebookTracker;

  protected readonly sanitizer: ISanitizer;
  protected readonly widget: TableOfContentsWidget;
  private _runningCells: Cell[];
}
