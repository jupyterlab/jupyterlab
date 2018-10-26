import React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import { PathExt } from '@jupyterlab/coreutils';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { IStatusBar, TextItem } from '@jupyterlab/statusbar';

import { Widget, Title } from '@phosphor/widgets';

/**
 * A namespace for FilePathComponent statics.
 */
namespace FilePathComponent {
  /**
   * The props for rendering a FilePathComponent.
   */
  export interface IProps {
    /**
     * The full path for a document.
     */
    fullPath: string;

    /**
     * The shorter name for a document or activity.
     */
    name: string;
  }
}

/**
 * A pure component for rendering a file path (or activity name).
 *
 * @param props - the props for the component.
 *
 * @returns a tsx component for a file path.
 */
function FilePathComponent(
  props: FilePathComponent.IProps
): React.ReactElement<FilePathComponent.IProps> {
  return <TextItem source={props.name} title={props.fullPath} />;
}

/**
 * A status bar item for the current file path (or activity name).
 */
class FilePath extends VDomRenderer<FilePath.Model> {
  /**
   * Construct a new FilePath status item.
   */
  constructor(opts: FilePath.IOptions) {
    super();
    this._docManager = opts.docManager;
    this.model = new FilePath.Model(this._docManager);
    this.node.title = this.model.path;
  }

  /**
   * Render the status item.
   */
  render() {
    return (
      <FilePathComponent fullPath={this.model!.path} name={this.model!.name!} />
    );
  }

  private _docManager: IDocumentManager;
}

/**
 * A namespace for FilePath statics.
 */
namespace FilePath {
  /**
   * A VDomModel for rendering the FilePath status item.
   */
  export class Model extends VDomModel {
    /**
     * Construct a new model.
     *
     * @param docManager: the application document manager. Used to check
     *   whether the current widget is a document.
     */
    constructor(docManager: IDocumentManager) {
      super();
      this._docManager = docManager;
    }

    /**
     * The current path for the application.
     */
    get path(): string {
      return this._path;
    }

    /**
     * The name of the current activity.
     */
    get name(): string {
      return this._name;
    }

    /**
     * The current widget for the application.
     */
    get widget(): Widget | null {
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

    /**
     * React to a title change for the current widget.
     */
    private _onTitleChange = (title: Title<Widget>) => {
      const oldState = this._getAllState();
      this._name = title.label;
      this._triggerChange(oldState, this._getAllState());
    };

    /**
     * React to a path change for the current document.
     */
    private _onPathChange = (
      _documentModel: DocumentRegistry.IContext<DocumentRegistry.IModel>,
      newPath: string
    ) => {
      const oldState = this._getAllState();
      this._path = newPath;
      this._name = PathExt.basename(newPath);

      this._triggerChange(oldState, this._getAllState());
    };

    /**
     * Get the current state of the model.
     */
    private _getAllState(): [string, string] {
      return [this._path, this._name];
    }

    /**
     * Trigger a state change to rerender.
     */
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

  /**
   * Options for creating the FilePath widget.
   */
  export interface IOptions {
    /**
     * The application document manager.
     */
    docManager: IDocumentManager;
  }
}

/**
 * A plugin providing a file path widget to the status bar.
 */
export const filePathStatus: JupyterLabPlugin<void> = {
  id: '@jupyterlab/statusbar:file-path-status',
  autoStart: true,
  requires: [IStatusBar, IDocumentManager],
  activate: (
    app: JupyterLab,
    statusBar: IStatusBar,
    docManager: IDocumentManager
  ) => {
    let item = new FilePath({ docManager });

    // Keep the file path widget up-to-date with the application active widget.
    item.model!.widget = app.shell.currentWidget;
    app.shell.currentChanged.connect(() => {
      item.model!.widget = app.shell.currentWidget;
    });

    statusBar.registerStatusItem('file-path-item', item, {
      align: 'right',
      rank: 0,
      isActive: () => {
        return true;
      }
    });
  }
};
