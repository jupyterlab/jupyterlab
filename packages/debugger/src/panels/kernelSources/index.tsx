/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { IEditorServices } from '@jupyterlab/codeeditor';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { PanelWithToolbar } from '@jupyterlab/ui-components';
import { IDebugger } from '../../tokens';
import { KernelSourcesBody } from './body';
// import { KernelSourcePathComponent } from './sourcepath';
// import { ReactWidget } from '@jupyterlab/ui-components';
// import React from 'react';

/**
 * A Panel that shows a preview of the source code while debugging.
 */
export class KernelSources extends PanelWithToolbar {
  /**
   * Instantiate a new Sources preview Panel.
   *
   * @param options The Sources instantiation options.
   */
  constructor(options: KernelSources.IOptions) {
    super();
    const { model, service, editorServices } = options;
    const trans = (options.translator ?? nullTranslator).load('jupyterlab');
    this.title.label = trans.__('Kernel Sources');

    this.toolbar.addClass('jp-DebuggerKernelSources-header');
    const body = new KernelSourcesBody({
      service,
      model,
      editorServices
    });
    /*
    const button = new ToolbarButton({
      icon: viewBreakpointIcon,
      onClick: (): void => model.open(),
      label: '/Users/echarles/miniconda3/envs/datalayer/lib/python3.8/os.py',
      tooltip: '/Users/echarles/miniconda3/envs/datalayer/lib/python3.8/os.py'
    });
    this.addWidget(button);
    */
    this.addClass('jp-DebuggerKernelSources-header');
    this.addWidget(body);
    this.addClass('jp-DebuggerKenelSources');
  }
}

/**
 * A namespace for `Sources` statics.
 */
export namespace KernelSources {
  /**
   * The options used to create a Sources.
   */
  export interface IOptions {
    /**
     * The debugger service.
     */
    service: IDebugger;

    /**
     * The model for the sources.
     */
    model: IDebugger.Model.ISources;

    /**
     * The editor services used to create new read-only editors.
     */
    editorServices: IEditorServices;

    /**
     * The application language translator
     */
    translator?: ITranslator;
  }
}
