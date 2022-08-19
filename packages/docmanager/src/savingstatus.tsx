// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentRegistry } from '@jupyterlab/docregistry';
import { TextItem } from '@jupyterlab/statusbar';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { VDomModel, VDomRenderer } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import React from 'react';
import { IDocumentManager } from './tokens';

/**
 * A namespace for SavingStatusComponent statics.
 */
namespace SavingStatusComponent {
  /**
   * The props for the SavingStatusComponent.
   */
  export interface IProps {
    /**
     * The current saving status, after translation.
     */
    fileStatus: string;
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
  return <TextItem source={props.fileStatus} />;
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
    const translator = opts.translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    this._statusMap = {
      completed: trans.__('Saving completed'),
      started: trans.__('Saving started'),
      failed: trans.__('Saving failed')
    };
  }

  /**
   * Render the SavingStatus item.
   */
  render(): JSX.Element | null {
    if (this.model === null || this.model.status === null) {
      return null;
    } else {
      return (
        <SavingStatusComponent
          fileStatus={this._statusMap[this.model.status]}
        />
      );
    }
  }

  private _statusMap: Record<DocumentRegistry.SaveState, string>;
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
    get widget(): Widget | null {
      return this._widget;
    }
    set widget(widget: Widget | null) {
      const oldWidget = this._widget;
      if (oldWidget !== null) {
        const oldContext = this._docManager.contextForWidget(oldWidget);
        if (oldContext) {
          oldContext.saveState.disconnect(this._onStatusChange);
        } else if ((this._widget as any).content?.saveStateChanged) {
          (this._widget as any).content.saveStateChanged.disconnect(
            this._onStatusChange
          );
        }
      }

      this._widget = widget;
      if (this._widget === null) {
        this._status = null;
      } else {
        const widgetContext = this._docManager.contextForWidget(this._widget);
        if (widgetContext) {
          widgetContext.saveState.connect(this._onStatusChange);
        } else if ((this._widget as any).content?.saveStateChanged) {
          (this._widget as any).content.saveStateChanged.connect(
            this._onStatusChange
          );
        }
      }
    }

    /**
     * React to a saving status change from the current document widget.
     */
    private _onStatusChange = (
      _: any,
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

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}
