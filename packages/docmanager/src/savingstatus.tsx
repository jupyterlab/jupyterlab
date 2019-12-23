// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React from 'react';

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import { IDocumentManager } from './tokens';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { TextItem } from '@jupyterlab/statusbar';

import { Widget } from '@lumino/widgets';

/**
 * A namespace for SavingStatusComponent statics.
 */
namespace SavingStatusComponent {
  /**
   * The props for the SavingStatusComponent.
   */
  export interface IProps {
    /**
     * The current saving status.
     */
    fileStatus: DocumentRegistry.SaveState | null;
  }
}

/**
 * A pure functional component for a Saving status item.
 *
 * @param props - the props for the component.
 *
 * @returns a tsx component for rendering the saving state.
 */
function SavingStatusComponent(
  props: SavingStatusComponent.IProps
): React.ReactElement<SavingStatusComponent.IProps> {
  return <TextItem source={`Saving ${props.fileStatus}`} />;
}

/**
 * The amount of time (in ms) to retain the saving completed message
 * before hiding the status item.
 */
const SAVING_COMPLETE_MESSAGE_MILLIS = 2000;

/**
 * A VDomRenderer for a saving status item.
 */
export class SavingStatus extends VDomRenderer<SavingStatus.Model> {
  /**
   * Create a new SavingStatus item.
   */
  constructor(opts: SavingStatus.IOptions) {
    super(new SavingStatus.Model(opts.docManager));
  }

  /**
   * Render the SavingStatus item.
   */
  render() {
    if (this.model === null || this.model.status === null) {
      return null;
    } else {
      return <SavingStatusComponent fileStatus={this.model.status} />;
    }
  }
}

/**
 * A namespace for SavingStatus statics.
 */
export namespace SavingStatus {
  /**
   * A VDomModel for the SavingStatus item.
   */
  export class Model extends VDomModel {
    /**
     * Create a new SavingStatus model.
     */
    constructor(docManager: IDocumentManager) {
      super();

      this._status = null;
      this.widget = null;
      this._docManager = docManager;
    }

    /**
     * The current status of the model.
     */
    get status(): DocumentRegistry.SaveState | null {
      return this._status!;
    }

    /**
     * The current widget for the model. Any widget can be assigned,
     * but it only has any effect if the widget is an IDocument widget
     * known to the application document manager.
     */
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

    /**
     * React to a saving status change from the current document widget.
     */
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

    private _status: DocumentRegistry.SaveState | null = null;
    private _widget: Widget | null = null;
    private _docManager: IDocumentManager;
  }

  /**
   * Options for creating a new SaveStatus item
   */
  export interface IOptions {
    /**
     * The application document manager.
     */
    docManager: IDocumentManager;
  }
}
