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
   * Instantiate a new Body for the KernelSourcesBody widget.
   *
   * @param options The instantiation options for a KernelSourcesBody.
   */
  constructor(options: KernelSourcesBody.IOptions) {
    super();
    this._model = options.model;
    this._debuggerService = options.service;
    this.layout = new PanelLayout();
    this.addClass('jp-DebuggerKernelSources-body');
    this._model.changed.connect((_, kernelSources) => {
      this._clear();
      if (kernelSources) {
        kernelSources.forEach(module => {
          const name = module.content;
          const path = module.path;
          const button = new ToolbarButton({
            icon: viewBreakpointIcon,
            onClick: (): void => {
              this._debuggerService
                .getSource({
                  sourceReference: 0,
                  path: path
                })
                .then(source => {
                  this._model.open(source);
                });
            },
            label: name,
            tooltip: path
          });
          (this.layout as PanelLayout).addWidget(button);
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
   * Clear the content of the kernel source read-only editor.
   */
  private _clear(): void {
    while ((this.layout as PanelLayout).widgets.length > 0) {
      (this.layout as PanelLayout).removeWidgetAt(0);
    }
  }

  private _model: IDebugger.Model.IKernelSources;
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
    model: IDebugger.Model.IKernelSources;
  }
}
