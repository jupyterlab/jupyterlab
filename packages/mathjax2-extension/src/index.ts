/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module mathjax2-extension
 */

import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { PageConfig } from '@jupyterlab/coreutils';
import { MathJaxTypesetter } from '@jupyterlab/mathjax2';
import { ILatexTypesetter } from '@jupyterlab/rendermime';

/**
 * The MathJax latexTypesetter plugin.
 */
const plugin: JupyterFrontEndPlugin<ILatexTypesetter> = {
  id: '@jupyterlab/mathjax2-extension:plugin',
  autoStart: true,
  provides: ILatexTypesetter,
  activate: () => {
    const [urlParam, configParam] = ['fullMathjaxUrl', 'mathjaxConfig'];
    const url = PageConfig.getOption(urlParam);
    const config = PageConfig.getOption(configParam);

    if (!url) {
      const message =
        `${plugin.id} uses '${urlParam}' and '${configParam}' in PageConfig ` +
        `to operate but '${urlParam}' was not found.`;

      throw new Error(message);
    }

    return new MathJaxTypesetter({ url, config });
  }
};

/**
 * Export the plugin as default.
 */
export default plugin;
