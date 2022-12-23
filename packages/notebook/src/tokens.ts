// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';
import { Cell } from '@jupyterlab/cells';
import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { NotebookTools } from './notebooktools';
import { NotebookPanel } from './panel';
import { NotebookWidgetFactory } from './widgetfactory';

/**
 * The notebook widget factory token.
 */
export const INotebookWidgetFactory = new Token<NotebookWidgetFactory.IFactory>(
  '@jupyterlab/notebook:INotebookWidgetFactory'
);

/**
 * The notebook tools token.
 */
export const INotebookTools = new Token<INotebookTools>(
  '@jupyterlab/notebook:INotebookTools'
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
    section?: 'common' | 'advanced' | string;

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
  '@jupyterlab/notebook:INotebookTracker'
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
