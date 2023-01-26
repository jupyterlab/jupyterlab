/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module mathjax-extension
 */

import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { MathJaxTypesetter } from '@jupyterlab/mathjax';
import { ILatexTypesetter } from '@jupyterlab/rendermime';

/**
 * The MathJax latexTypesetter plugin.
 */
const plugin: JupyterFrontEndPlugin<ILatexTypesetter> = {
  id: '@jupyterlab/mathjax-extension:plugin',
  autoStart: true,
  provides: ILatexTypesetter,
  activate: () => new MathJaxTypesetter()
};

/**
 * Export the plugin as default.
 */
export default plugin;
