/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ToolbarButton } from '@jupyterlab/apputils';

import { IEditorServices } from '@jupyterlab/codeeditor';

import { nullTranslator, ITranslator } from '@jupyterlab/translation';

import { Panel } from '@lumino/widgets';

import { viewBreakpointIcon } from '../../icons';

import { IDebugger } from '../../tokens';

import { SourcesBody } from './body';

import { SourcesHeader } from './header';

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

    const header = new SourcesHeader(model, translator);
    const body = new SourcesBody({
      service,
      model,
      editorServices
    });
    header.toolbar.addItem(
      'open',
      new ToolbarButton({
        icon: viewBreakpointIcon,
        onClick: (): void => model.open(),
        tooltip: trans.__('Open in the Main Area')
      })
    );
    this.addWidget(header);
    this.addWidget(body);
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
