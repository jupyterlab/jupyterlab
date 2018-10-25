/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLabPlugin } from '@jupyterlab/application';

import { PageConfig } from '@jupyterlab/coreutils';

import { ILatexTypesetter } from '@jupyterlab/rendermime';

import { MathJaxTypesetter } from '@jupyterlab/mathjax2';

/**
 * The MathJax latexTypesetter plugin.
 */
const plugin: JupyterLabPlugin<ILatexTypesetter> = {
  id: '@jupyterlab/mathjax2-extension:plugin',
  autoStart: true,
  provides: ILatexTypesetter,
  activate: () => {
    let url = PageConfig.getOption('mathjaxUrl');
    let config = PageConfig.getOption('mathjaxConfig');
    return new MathJaxTypesetter({ url, config });
  }
};

/**
 * Export the plugin as default.
 */
export default plugin;
