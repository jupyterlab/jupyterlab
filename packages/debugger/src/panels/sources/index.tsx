/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { IEditorServices } from '@jupyterlab/codeeditor';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  PanelWithToolbar,
  ReactWidget,
  ToolbarButton,
  viewBreakpointIcon
} from '@jupyterlab/ui-components';
import React from 'react';
import { IDebugger } from '../../tokens';
import { SourcesBody } from './body';
import { SourcePathComponent } from './sourcepath';

/**
 * A Panel that shows a preview of the source code while debugging.
 */
export class Sources extends PanelWithToolbar {
  /**
   * Instantiate a new Sources preview Panel.
   *
   * @param options The Sources instantiation options.
   */
  constructor(options: Sources.IOptions) {
    super();
    const { model, service, editorServices } = options;
    const trans = (options.translator ?? nullTranslator).load('jupyterlab');
    this.title.label = trans.__('Source');

    this.toolbar.addClass('jp-DebuggerSources-header');
    this.toolbar.node.setAttribute(
      'aria-label',
      trans.__('Sources preview panel toolbar')
    );
    const body = new SourcesBody({
      service,
      model,
      editorServices
    });
    this.toolbar.addItem(
      'open',
      new ToolbarButton({
        icon: viewBreakpointIcon,
        onClick: (): void => model.open(),
        tooltip: trans.__('Open in the Main Area')
      })
    );
    const sourcePath = ReactWidget.create(
      <SourcePathComponent model={model} trans={trans} />
    );

    this.toolbar.addItem('sourcePath', sourcePath);
    this.addClass('jp-DebuggerSources-header');

    this.addWidget(body);
    this.addClass('jp-DebuggerSources');
  }
}

/**
 * A namespace for `Sources` statics.
 */
export namespace Sources {
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
