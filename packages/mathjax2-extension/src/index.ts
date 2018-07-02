/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLabPlugin } from '@jupyterlab/application';

import { PageConfig } from '@jupyterlab/coreutils';

import { ILatexTypesetter } from '@jupyterlab/rendermime';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { PromiseDelegate } from '@phosphor/coreutils';

// Stub for window MathJax.
declare var MathJax: any;

/**
 * The MathJax latexTypesetter plugin.
 */
const plugin: JupyterLabPlugin<ILatexTypesetter> = {
  id: '@jupyterlab/mathjax2-extension:plugin',
  autoStart: true,
  provides: ILatexTypesetter,
  activate: () => new MathJaxTypesetter()
};

/**
 * Export the plugin as default.
 */
export default plugin;

/**
 * The MathJax Typesetter.
 */
export class MathJaxTypesetter implements IRenderMime.ILatexTypesetter {
  /**
   * Typeset the math in a node.
   *
   * #### Notes
   * MathJax schedules the typesetting asynchronously,
   * but there are not currently any callbacks or Promises
   * firing when it is done.
   */
  typeset(node: HTMLElement): void {
    if (!this._initialized) {
      this._init();
    }
    this._initPromise.promise.then(() => {
      MathJax.Hub.Queue(['Typeset', MathJax.Hub, node]);
      try {
        MathJax.Hub.Queue(
          ['Require', MathJax.Ajax, '[MathJax]/extensions/TeX/AMSmath.js'],
          () => {
            MathJax.InputJax.TeX.resetEquationNumbers();
          }
        );
      } catch (e) {
        console.error('Error queueing resetEquationNumbers:', e);
      }
    });
  }

  /**
   * Initialize MathJax.
   */
  private _init(): void {
    let url = PageConfig.getOption('mathjaxUrl');
    let config = PageConfig.getOption('mathjaxConfig');
    let head = document.getElementsByTagName('head')[0];
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `${url}?config=${config}&amp;delayStartupUntil=configured" charset="utf-8"`;
    head.appendChild(script);
    script.addEventListener('load', () => {
      this._onLoad();
    });
    this._initialized = true;
  }

  /**
   * Handle MathJax loading.
   */
  private _onLoad(): void {
    MathJax.Hub.Config({
      tex2jax: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      // Center justify equations in code and markdown cells. Elsewhere
      // we use CSS to left justify single line equations in code cells.
      displayAlign: 'center',
      CommonHTML: {
        linebreaks: { automatic: true }
      },
      'HTML-CSS': {
        availableFonts: [],
        imageFont: null,
        preferredFont: null,
        webFont: 'STIX-Web',
        styles: { '.MathJax_Display': { margin: 0 } },
        linebreaks: { automatic: true }
      },
      skipStartupTypeset: true
    });
    MathJax.Hub.Configured();
    this._initPromise.resolve(void 0);
  }

  private _initPromise = new PromiseDelegate<void>();
  private _initialized = false;
}
