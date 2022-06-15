import { JupyterFrontEnd } from '@jupyterlab/application';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { ISignal, Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { IDocumentWidgetOpener } from './tokens';

export class DocumentWidgetOpener implements IDocumentWidgetOpener {
  constructor(options: DocumentWidgetOpener.IOptions) {
    this._shell = options.shell;
  }

  get opened(): ISignal<IDocumentWidgetOpener, Widget> {
    return this._opened;
  }

  open(widget: Widget, options?: DocumentRegistry.IOpenOptions) {
    if (!widget.id) {
      widget.id = `document-manager-${++Private.id}`;
    }
    widget.title.dataset = {
      type: 'document-title',
      ...widget.title.dataset
    };
    if (!widget.isAttached) {
      this._shell.add(widget, 'main', options || {});
    }
    this._shell.activateById(widget.id);
    this._opened.emit(widget);
  }

  private _shell: JupyterFrontEnd.IShell;
  private _opened = new Signal<this, Widget>(this);
}

export namespace DocumentWidgetOpener {
  export interface IOptions {
    shell: JupyterFrontEnd.IShell;
  }
}

namespace Private {
  export let id = 0;
}
