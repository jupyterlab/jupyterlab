/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { IEditorServices } from '@jupyterlab/codeeditor';
import { ITranslator } from '@jupyterlab/translation';
import { ToolbarButton } from '@jupyterlab/ui-components';
import { viewBreakpointIcon } from '../../icons';
import { IDebugger } from '../../tokens';
import { SourcePathComponent } from './sourcepath';
import { SourcesBody } from './body';
import { ReactWidget } from '@jupyterlab/ui-components';
import React from 'react';
import { PanelWithToolbar } from '../panelwithtoolbar';

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
    super(options);
    const { model, service, editorServices } = options;
    this.title.label = this.trans.__('Source');

    this.toolbar.addClass('jp-DebuggerSources-header');
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
        tooltip: this.trans.__('Open in the Main Area')
      })
    );
    const sourcePath = ReactWidget.create(
      <SourcePathComponent model={model} />
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
