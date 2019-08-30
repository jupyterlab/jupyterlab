// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDataConnector } from '@jupyterlab/coreutils';

import { BoxPanel, TabPanel } from '@phosphor/widgets';

import { ReadonlyJSONValue, UUID } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { DebuggerSidebar } from './sidebar';
import { INotebookTracker } from '@jupyterlab/notebook';
import { CodeCell } from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { Editor } from 'codemirror';

export class Debugger extends BoxPanel {
  constructor(options: Debugger.IOptions) {
    super({ direction: 'left-to-right' });
    this.tracker = options.tracker;

    this.model = new Debugger.Model(options);
    this.sidebar = new DebuggerSidebar(this.model);
    this.title.label = 'Debugger';

    this.addClass('jp-Debugger');
    this.addWidget(this.tabs);
    this.addWidget(this.sidebar);

    this.tracker.activeCellChanged.connect(this.onActiveCellChanged, this);
  }

  readonly model: Debugger.Model;

  readonly tabs = new TabPanel();

  readonly sidebar: DebuggerSidebar;

  tracker: INotebookTracker;

  protected onActiveCellChanged() {
    const activeCell = this.getCell();
    this.setEditor(activeCell);
  }

  protected getCell(): CodeCell {
    return this.tracker.activeCell as CodeCell;
  }

  setEditor(cell: CodeCell) {
    if (!cell || !cell.editor) {
      return;
    }

    const editor = cell.editor as CodeMirrorEditor;
    editor.setOption('lineNumbers', true);
    editor.editor.setOption('gutters', [
      'CodeMirror-linenumbers',
      'breakpoints'
    ]);

    editor.editor.on('gutterClick', this.addBreakpoint);
  }

  protected addBreakpoint = (editor: Editor, lineNumber: number) => {
    const info = editor.lineInfo(lineNumber);
    if (!info) {
      return;
    }

    console.log(info);

    const breakpoint = {
      line: lineNumber,
      text: info.text,
      remove: !!info.gutterMarkers
    };
    editor.setGutterMarker(
      lineNumber,
      'breakpoints',
      breakpoint.remove ? null : this.createMarkerNode()
    );
  };

  createMarkerNode() {
    var marker = document.createElement('div');
    marker.className = 'jp-breakpoint-marker';
    marker.innerHTML = '●';
    return marker;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.model.dispose();
    super.dispose();
  }
}

/**
 * A namespace for `Debugger` statics.
 */
export namespace Debugger {
  export interface IOptions {
    connector?: IDataConnector<ReadonlyJSONValue>;
    tracker?: INotebookTracker;
    id?: string;
  }

  export class Model implements IDisposable {
    constructor(options: Debugger.Model.IOptions) {
      this.connector = options.connector || null;
      this.id = options.id || UUID.uuid4();
      void this._populate();
    }

    readonly connector: IDataConnector<ReadonlyJSONValue> | null;

    readonly id: string;

    get isDisposed(): boolean {
      return this._isDisposed;
    }

    dispose(): void {
      this._isDisposed = true;
    }

    private async _populate(): Promise<void> {
      const { connector } = this;

      if (!connector) {
        return;
      }
    }

    private _isDisposed = false;
  }

  export namespace Model {
    export interface IOptions extends Debugger.IOptions {}
  }
}
