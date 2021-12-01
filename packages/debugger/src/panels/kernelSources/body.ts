// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { viewBreakpointIcon } from '../../icons';

import { ToolbarButton } from '@jupyterlab/ui-components';

import { Signal } from '@lumino/signaling';

import { PanelLayout, Widget } from '@lumino/widgets';

import { EditorHandler } from '../../handlers/editor';

import { IDebugger } from '../../tokens';

/**
 * The body for a Sources Panel.
 */
export class KernelSourcesBody extends Widget {
  /**
   * Instantiate a new Body for the SourcesBody widget.
   *
   * @param options The instantiation options for a SourcesBody.
   */
  constructor(options: KernelSourcesBody.IOptions) {
    super();
    this._model = options.model;
    this._debuggerService = options.service;

    const layout = new PanelLayout();
    this.layout = layout;
    this.addClass('jp-DebuggerKernelSources-body');

    this._model.currentFrameChanged.connect(async (_, frame) => {
      if (!frame) {
        this._clear();
        return;
      }
    });

    this._debuggerService.eventMessage.connect((_, event) => {
      if (event.event === 'initialized') {
        this._debuggerService.eventMessage.connect((_, event) => {
          if (event.event === 'initialized') {
            this._debuggerService.session
              ?.sendRequest('modules', {})
              .then(reply => {
                reply.body.modules.forEach(module => {
                  const name = Object.keys(module)[0];
                  const path = Object.values(module)[0];
                  const button = new ToolbarButton({
                    icon: viewBreakpointIcon,
                    onClick: (): void => {
                      this._debuggerService
                        .getSource({
                          sourceReference: 0,
                          path: path
                        })
                        .then(source => {
                          this._model.currentSource = source;
                          this._model.open();
                        });
                    },
                    label: name,
                    tooltip: path
                  });
                  layout.addWidget(button);
                });
              });
          }
        });
      }
    });
  }

  /**
   * Dispose the sources body widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._editorHandler?.dispose();
    Signal.clearData(this);
    super.dispose();
  }

  /**
   * Clear the content of the source read-only editor.
   */
  private _clear(): void {
    this._model.currentSource = null;
  }

  private _model: IDebugger.Model.ISources;
  private _editorHandler: EditorHandler;
  private _debuggerService: IDebugger;
}

/**
 * A namespace for SourcesBody `statics`.
 */
export namespace KernelSourcesBody {
  /**
   * Instantiation options for `Breakpoints`.
   */
  export interface IOptions {
    /**
     * The debug service.
     */
    service: IDebugger;

    /**
     * The sources model.
     */
    model: IDebugger.Model.ISources;
  }
}
