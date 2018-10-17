import React from 'react';

import {
  JupyterLabPlugin,
  JupyterLab,
  ApplicationShell
} from '@jupyterlab/application';
import { IDefaultsManager } from './manager';
import { TextItem } from '../component/text';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import { IDisposable } from '@phosphor/disposable';
import { ISignal } from '@phosphor/signaling';
import { Token } from '@phosphor/coreutils';
import { Widget } from '@phosphor/widgets';
import { IDocumentManager } from '@jupyterlab/docmanager';

namespace SavingStatusComponent {
  export interface IProps {
    fileStatus: string | null;
  }
}

// tslint:disable-next-line:variable-name
const SavingStatusComponent = (
  props: SavingStatusComponent.IProps
): React.ReactElement<SavingStatusComponent.IProps> => {
  return <TextItem source={`Saving ${props.fileStatus}`} />;
};

const SAVING_COMPLETE_MESSAGE_MILLIS = 2000;

class SavingStatus extends VDomRenderer<SavingStatus.Model>
  implements ISavingStatus {
  constructor(opts: SavingStatus.IOptions) {
    super();

    this._shell = opts.shell;
    this._docManager = opts.docManager;

    this._shell.currentChanged.connect(this._onShellCurrentChanged);

    this.model = new SavingStatus.Model(
      this._shell.currentWidget,
      this._docManager
    );
  }

  render() {
    if (this.model === null || this.model.status === null) {
      return null;
    } else {
      return <SavingStatusComponent fileStatus={this.model.status} />;
    }
  }

  dispose() {
    super.dispose();

    this._shell.currentChanged.disconnect(this._onShellCurrentChanged);
  }

  private _onShellCurrentChanged = (
    shell: ApplicationShell,
    change: ApplicationShell.IChangedArgs
  ) => {
    this.model!.widget = change.newValue;
  };

  private _shell: ApplicationShell;
  private _docManager: IDocumentManager;
}

namespace SavingStatus {
  export class Model extends VDomModel implements ISavingStatus.IModel {
    constructor(widget: Widget | null, docManager: IDocumentManager) {
      super();

      this._status = null;
      this.widget = widget;
      this._docManager = docManager;
    }

    get status() {
      return this._status!;
    }

    get widget() {
      return this._widget;
    }

    set widget(widget: Widget | null) {
      const oldWidget = this._widget;
      if (oldWidget !== null) {
        const oldContext = this._docManager.contextForWidget(oldWidget);
        if (oldContext) {
          oldContext.saveState.disconnect(this._onStatusChange);
        }
      }

      this._widget = widget;
      if (this._widget === null) {
        this._status = null;
      } else {
        const widgetContext = this._docManager.contextForWidget(this._widget);
        if (widgetContext) {
          widgetContext.saveState.connect(this._onStatusChange);
        }
      }
    }

    private _onStatusChange = (
      _documentModel: DocumentRegistry.IContext<DocumentRegistry.IModel>,
      newStatus: DocumentRegistry.SaveState
    ) => {
      this._status = newStatus;

      if (this._status === 'completed') {
        setTimeout(() => {
          this._status = null;
          this.stateChanged.emit(void 0);
        }, SAVING_COMPLETE_MESSAGE_MILLIS);
        this.stateChanged.emit(void 0);
      } else {
        this.stateChanged.emit(void 0);
      }
    };

    private _status: DocumentRegistry.SaveState | null;
    private _widget: Widget | null = null;
    private _docManager: IDocumentManager;
  }

  export interface IOptions {
    shell: ApplicationShell;
    docManager: IDocumentManager;
  }
}

export interface ISavingStatus extends IDisposable {
  readonly model: ISavingStatus.IModel | null;
  readonly modelChanged: ISignal<this, void>;
}

export namespace ISavingStatus {
  export interface IModel {
    readonly status: DocumentRegistry.SaveState;
    readonly widget: Widget | null;
    readonly stateChanged: ISignal<this, void>;
  }
}

// tslint:disable-next-line:variable-name
export const ISavingStatus = new Token<ISavingStatus>(
  '@jupyterlab/statusbar:ISavingStatus'
);

export const savingStatusItem: JupyterLabPlugin<ISavingStatus> = {
  id: '@jupyterlab/statusbar:saving-status-item',
  autoStart: true,
  provides: ISavingStatus,
  requires: [IDefaultsManager, IDocumentManager],
  activate: (
    app: JupyterLab,
    manager: IDefaultsManager,
    docManager: IDocumentManager
  ) => {
    let item = new SavingStatus({ shell: app.shell, docManager });

    manager.addDefaultStatus('saving-status-item', item, {
      align: 'middle',
      isActive: () => {
        return true;
      },
      stateChanged: item.model!.stateChanged
    });

    return item;
  }
};
