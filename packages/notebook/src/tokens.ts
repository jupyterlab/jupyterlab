// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  ISessionContext,
  ISessionContextDialogs,
  IWidgetTracker
} from '@jupyterlab/apputils';
import type { Cell } from '@jupyterlab/cells';
import type { ITranslator } from '@jupyterlab/translation';
import { Token } from '@lumino/coreutils';
import type { ISignal, Signal } from '@lumino/signaling';
import type { Widget } from '@lumino/widgets';
import type { NotebookTools } from './notebooktools';
import type { NotebookPanel } from './panel';
import type { Notebook } from './widget';
import type { NotebookWidgetFactory } from './widgetfactory';
import type { KernelError } from './actions';

/**
 * The notebook widget factory token.
 */
export const INotebookWidgetFactory = new Token<NotebookWidgetFactory.IFactory>(
  '@jupyterlab/notebook:INotebookWidgetFactory',
  'A service to create the notebook viewer.'
);

/**
 * The notebook tools token.
 */
export const INotebookTools = new Token<INotebookTools>(
  '@jupyterlab/notebook:INotebookTools',
  `A service for the "Notebook Tools" panel in the
  right sidebar. Use this to add your own functionality to the panel.`
);

/**
 * The interface for notebook metadata tools.
 */
export interface INotebookTools extends Widget {
  activeNotebookPanel: NotebookPanel | null;
  activeCell: Cell | null;
  selectedCells: Cell[];
  addItem(options: NotebookTools.IAddOptions): void;
  addSection(options: NotebookTools.IAddSectionOptions): void;
}

/**
 * The namespace for NotebookTools class statics.
 */
export namespace INotebookTools {
  /**
   * The options used to add an item to the notebook tools.
   */
  export interface IAddOptions {
    /**
     * The tool to add to the notebook tools area.
     */
    tool: ITool;

    /**
     * The section to which the tool should be added.
     */
    section: 'advanced' | string;

    /**
     * The rank order of the widget among its siblings.
     */
    rank?: number;
  }

  /**
   * The options used to add a section to the notebook tools.
   */
  export interface IAddSectionOptions {
    /**
     * The name of the new section.
     */
    sectionName: string;

    /**
     * The tool to add to the notebook tools area.
     */
    tool?: INotebookTools.ITool;

    /**
     * The label of the new section.
     */
    label?: string;

    /**
     * The rank order of the section among its siblings.
     */
    rank?: number;
  }

  export interface ITool extends Widget {
    /**
     * The notebook tools object.
     */
    notebookTools: INotebookTools;
  }
}

/**
 * The notebook tracker token.
 */
export const INotebookTracker = new Token<INotebookTracker>(
  '@jupyterlab/notebook:INotebookTracker',
  `A widget tracker for notebooks.
  Use this if you want to be able to iterate over and interact with notebooks
  created by the application.`
);

/**
 * An object that tracks notebook widgets.
 */
export interface INotebookTracker extends IWidgetTracker<NotebookPanel> {
  /**
   * The currently focused cell.
   *
   * #### Notes
   * If there is no cell with the focus, then this value is `null`.
   */
  readonly activeCell: Cell | null;

  /**
   * A signal emitted when the current active cell changes.
   *
   * #### Notes
   * If there is no cell with the focus, then `null` will be emitted.
   */
  readonly activeCellChanged: ISignal<this, Cell | null>;

  /**
   * A signal emitted when the selection state changes.
   */
  readonly selectionChanged: ISignal<this, void>;
}

export interface IExecutionOptions {
  /**
   * Cell to execute
   */
  cell: Cell;
  /**
   * Notebook to which the cell belongs
   */
  notebook: Notebook;
  /**
   * A signal that emits whenever a cell completes execution.
   */
  executed: Signal<
    any,
    {
      notebook: Notebook;
      cell: Cell;
      success: boolean;
      error?: KernelError | null;
    }
  >;
  /**
   * A signal that emits whenever a cell execution is scheduled.
   */
  executionScheduled: Signal<any, { notebook: Notebook; cell: Cell }>;
  /**
   * Document session context
   */
  sessionContext?: ISessionContext;
  /**
   * Session dialogs
   */
  sessionDialogs?: ISessionContextDialogs;
  /**
   * Application translator
   */
  translator?: ITranslator;
}

/**
 * Notebook cell executor interface
 */
export interface ICellExecutor {
  /**
   * Execute a cell.
   *
   * @param options Cell execution options
   */
  runCell(options: IExecutionOptions): Promise<boolean>;
}

/**
 * The notebook cell executor token.
 */
export const ICellExecutor = new Token<ICellExecutor>(
  '@jupyterlab/notebook:ICellExecutor',
  `The notebook cell executor`
);
