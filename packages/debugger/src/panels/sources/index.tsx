/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { IEditorServices } from '@jupyterlab/codeeditor';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { Toolbar, ToolbarButton } from '@jupyterlab/ui-components';
import { Panel } from '@lumino/widgets';
import { viewBreakpointIcon } from '../../icons';
import { IDebugger } from '../../tokens';
import { SourcePathComponent } from './sourcepath';
import { SourcesBody } from './body';
import { ReactWidget } from '@jupyterlab/ui-components';
import React from 'react';

/**
 * A Panel that shows a preview of the source code while debugging.
 */
export class Sources extends Panel {
  /**
   * Instantiate a new Sources preview Panel.
   *
   * @param options The Sources instantiation options.
   */
  constructor(options: Sources.IOptions) {
    super();
    const { model, service, editorServices } = options;
    const translator = options.translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    this.title.label = trans.__('Sources');

    this._header = new Toolbar();
    this._header.addClass('jp-stack-panel-header');
    this._header.addClass('jp-DebuggerSources-header');
    const body = new SourcesBody({
      service,
      model,
      editorServices
    });
    this._header.addItem(
      'open',
      new ToolbarButton({
        icon: viewBreakpointIcon,
        onClick: (): void => model.open(),
        tooltip: trans.__('Open in the Main Area')
      })
    );
    const sourcePath = ReactWidget.create(
      <SourcePathComponent model={model} />
    );

    this._header.addItem('sourcePath', sourcePath);
    this.addClass('jp-DebuggerSources-header');
    this.addWidget(this._header);
    this.addWidget(body);
    this.addClass('jp-DebuggerSources');
  }

  get header(): Toolbar {
    return this._header;
  }

  /**
   * The toolbar widget, it is not attached to current widget
   * but is rendered by the sidebar panel.
   */
  private _header: Toolbar;
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
