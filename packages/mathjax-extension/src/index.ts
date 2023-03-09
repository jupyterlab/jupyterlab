/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module mathjax-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { PageConfig } from '@jupyterlab/coreutils';
import { ILatexTypesetter } from '@jupyterlab/rendermime';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { MathJaxTypesetter } from './typesetter';
export { MathJaxTypesetter } from './typesetter';

/**
 * The MathJax latexTypesetter plugin.
 */
const plugin: JupyterFrontEndPlugin<ILatexTypesetter> = {
  id: '@jupyterlab/mathjax-extension:plugin',
  autoStart: true,
  provides: ILatexTypesetter,
  optional: [ITranslator],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator | null
  ): ILatexTypesetter => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    const [urlParam, configParam] = ['fullMathjaxUrl', 'mathjaxConfig'];
    const url = PageConfig.getOption(urlParam);
    const config = PageConfig.getOption(configParam);

    if (!url) {
      const message = trans.__(
        "%1 uses '%2' and '%3' in PageConfig to operate but '%4' was not found.",
        plugin.id,
        urlParam,
        configParam,
        urlParam
      );

      throw new Error(message);
    }

    return new MathJaxTypesetter({ url, config });
  }
};

/**
 * Export the plugin as default.
 */
export default plugin;
