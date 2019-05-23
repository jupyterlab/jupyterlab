// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@phosphor/coreutils';
import { ISignal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';

import { IInstanceTracker } from '@jupyterlab/apputils';
import { Cell } from '@jupyterlab/cells';

import { NotebookPanel } from './panel';
import { NotebookTools } from './notebooktools';

/* tslint:disable */
/**
 * The notebook tools token.
 */
export const INotebookTools = new Token<INotebookTools>(
  '@jupyterlab/notebook:INotebookTools'
);
/* tslint:enable */

/**
 * The interface for notebook metadata tools.
 */
export interface INotebookTools extends Widget {
  activeNotebookPanel: NotebookPanel | null;
  activeCell: Cell | null;
  selectedCells: Cell[];
  addItem(options: NotebookTools.IAddOptions): void;
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
    section?: 'common' | 'advanced';

    /**
     * The rank order of the widget among its siblings.
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

/* tslint:disable */
/**
 * The notebook tracker token.
 */
export const INotebookTracker = new Token<INotebookTracker>(
  '@jupyterlab/notebook:INotebookTracker'
);
/* tslint:enable */

/**
 * An object that tracks notebook widgets.
 */
export interface INotebookTracker extends IInstanceTracker<NotebookPanel> {
  /**
   * The currently focused cell.
   *
   * #### Notes
   * If there is no cell with the focus, then this value is `null`.
   */
  readonly activeCell: Cell;

  /**
   * A signal emitted when the current active cell changes.
   *
   * #### Notes
   * If there is no cell with the focus, then `null` will be emitted.
   */
  readonly activeCellChanged: ISignal<this, Cell>;

  /**
   * A signal emitted when the selection state changes.
   */
  readonly selectionChanged: ISignal<this, void>;
}
