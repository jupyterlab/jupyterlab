/**
 * Default item to display the file path of the active document.
 */
/**
 * Part of Jupyterlab status bar defaults.
 */
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
import { PathExt } from '@jupyterlab/coreutils';
import { Widget, Title } from '@phosphor/widgets';
import { IDocumentManager } from '@jupyterlab/docmanager';

namespace FilePathComponent {
  export interface IProps {
    fullPath: string;
    name: string;
  }
}

// tslint:disable-next-line:variable-name
const FilePathComponent = (
  props: FilePathComponent.IProps
): React.ReactElement<FilePathComponent.IProps> => {
  return <TextItem source={props.name} />;
};

class FilePath extends VDomRenderer<FilePath.Model> implements IFilePath {
  constructor(opts: FilePath.IOptions) {
    super();

    this._shell = opts.shell;
    this._docManager = opts.docManager;

    this._shell.currentChanged.connect(this._onShellCurrentChanged);

    this.model = new FilePath.Model(
      this._shell.currentWidget,
      this._docManager
    );

    this.node.title = this.model.path;
  }

  render() {
    if (this.model === null) {
      return null;
    } else {
      this.node.title = this.model.path;
      return (
        <FilePathComponent fullPath={this.model.path} name={this.model.name!} />
      );
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

namespace FilePath {
  export class Model extends VDomModel implements IFilePath.IModel {
    constructor(widget: Widget | null, docManager: IDocumentManager) {
      super();

      this.widget = widget;
      this._docManager = docManager;
    }

    get path() {
      return this._path;
    }

    get name() {
      return this._name;
    }

    get widget() {
      return this._widget;
    }

    set widget(widget: Widget | null) {
      const oldWidget = this._widget;
      if (oldWidget !== null) {
        const oldContext = this._docManager.contextForWidget(oldWidget);
        if (oldContext) {
          oldContext.pathChanged.disconnect(this._onPathChange);
        } else {
          oldWidget.title.changed.disconnect(this._onTitleChange);
        }
      }

      const oldState = this._getAllState();
      this._widget = widget;
      if (this._widget === null) {
        this._path = '';
        this._name = '';
      } else {
        const widgetContext = this._docManager.contextForWidget(this._widget);
        if (widgetContext) {
          this._path = widgetContext.path;
          this._name = PathExt.basename(widgetContext.path);

          widgetContext.pathChanged.connect(this._onPathChange);
        } else {
          this._path = '';
          this._name = this._widget.title.label;

          this._widget.title.changed.connect(this._onTitleChange);
        }
      }

      this._triggerChange(oldState, this._getAllState());
    }

    private _onTitleChange = (title: Title<Widget>) => {
      const oldState = this._getAllState();
      this._name = title.label;

      this._triggerChange(oldState, this._getAllState());
    };

    private _onPathChange = (
      _documentModel: DocumentRegistry.IContext<DocumentRegistry.IModel>,
      newPath: string
    ) => {
      const oldState = this._getAllState();
      this._path = newPath;
      this._name = PathExt.basename(newPath);

      this._triggerChange(oldState, this._getAllState());
    };

    private _getAllState(): [string, string] {
      return [this._path, this._name];
    }

    private _triggerChange(
      oldState: [string, string],
      newState: [string, string]
    ) {
      if (oldState[0] !== newState[0] || oldState[1] !== newState[1]) {
        this.stateChanged.emit(void 0);
      }
    }

    private _path: string = '';
    private _name: string = '';
    private _widget: Widget | null = null;
    private _docManager: IDocumentManager;
  }

  export interface IOptions {
    shell: ApplicationShell;
    docManager: IDocumentManager;
  }
}

export interface IFilePath extends IDisposable {
  readonly model: IFilePath.IModel | null;
  readonly modelChanged: ISignal<this, void>;
}

export namespace IFilePath {
  export interface IModel {
    readonly path: string;
    readonly name: string;
    readonly widget: Widget | null;
    readonly stateChanged: ISignal<this, void>;
  }
}

// tslint:disable-next-line:variable-name
export const IFilePath = new Token<IFilePath>(
  '@jupyterlab/statusbar:IFilePath'
);

export const filePathItem: JupyterLabPlugin<IFilePath> = {
  id: '@jupyterlab/statusbar:file-path-item',
  autoStart: true,
  provides: IFilePath,
  requires: [IDefaultsManager, IDocumentManager],
  activate: (
    app: JupyterLab,
    manager: IDefaultsManager,
    docManager: IDocumentManager
  ) => {
    let item = new FilePath({ shell: app.shell, docManager });

    manager.addDefaultStatus('file-path-item', item, {
      align: 'right',
      priority: 0,
      isActive: () => {
        return true;
      }
    });

    return item;
  }
};
