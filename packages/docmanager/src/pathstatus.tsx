// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PathExt } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { TextItem } from '@jupyterlab/statusbar';
import { VDomModel, VDomRenderer } from '@jupyterlab/ui-components';
import { Title, Widget } from '@lumino/widgets';
import React from 'react';
import { IDocumentManager } from './tokens';

/**
 * A namespace for PathStatusComponent statics.
 */
namespace PathStatusComponent {
  /**
   * The props for rendering a PathStatusComponent.
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
function PathStatusComponent(
  props: PathStatusComponent.IProps
): React.ReactElement<PathStatusComponent.IProps> {
  return <TextItem source={props.name} title={props.fullPath} />;
}

/**
 * A status bar item for the current file path (or activity name).
 */
export class PathStatus extends VDomRenderer<PathStatus.Model> {
  /**
   * Construct a new PathStatus status item.
   */
  constructor(opts: PathStatus.IOptions) {
    super(new PathStatus.Model(opts.docManager));
    this.node.title = this.model.path;
  }

  /**
   * Render the status item.
   */
  render(): JSX.Element {
    return (
      <PathStatusComponent
        fullPath={this.model!.path}
        name={this.model!.name!}
      />
    );
  }
}

/**
 * A namespace for PathStatus statics.
 */
export namespace PathStatus {
  /**
   * A VDomModel for rendering the PathStatus status item.
   */
  export class Model extends VDomModel {
    /**
     * Construct a new model.
     *
     * @param docManager the application document manager. Used to check
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
   * Options for creating the PathStatus widget.
   */
  export interface IOptions {
    /**
     * The application document manager.
     */
    docManager: IDocumentManager;
  }
}
