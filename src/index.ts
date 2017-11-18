// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

// the MathJax core
import {
  MathJax
} from 'mathjax3/mathjax3/mathjax';
// TeX input
import {
TeX
} from 'mathjax3/mathjax3/input/tex';

// HTML output
import {
  CHTML
} from 'mathjax3/mathjax3/output/chtml';

// handler for HTML documents
import {HTMLHandler} from "mathjax3/mathjax3/handlers/html/HTMLHandler.js";
MathJax.handlers.register(new HTMLHandler());



/**
 * The MathJax 3 Typesetter.
 */
export
class MathJax3Typesetter implements IRenderMime.ILatexTypesetter {

  constructor() {
    // initialize mathjax with with a DOM document (e.g., browser, jsdom); other documents are possible
    const chtml = new CHTML();
    chtml.nodes.document = window.document;
    this._html = MathJax.document(window.document, {
      InputJax: new TeX({inlineMath: [['$', '$'], ['\\(', '\\)'] ]}),
      OutputJax: chtml
    });
    }

  /**
   * Typeset the math in a node.
   */
  typeset(node: HTMLElement): void {
    // Note: these functions set fields
    // that indicate they have already been run,
    // which prevents them from being rerun.
    // I am not sure if this is intended behavior,
    // but setting those fields to false forces
    // the rerender.
    this._html.processed.findMath = false;
    this._html.processed.compile = false;
    this._html.processed.getMetrics = false;
    this._html.processed.typeset = false;
    this._html.processed.updateDocument = false;
    this._html.findMath({ elements: [node] })
    .compile()
    .getMetrics()
    .typeset()
    .updateDocument();
  }
  private _html: any;
}

/**
 * The MathJax 3 extension.
 */
const mathJax3Plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.mathjax3',
  requires: [],
  activate: (app: JupyterLab) => {
    const typesetter = new MathJax3Typesetter();
    app.rendermime.latexTypesetter = typesetter;
  },
  autoStart: true
}

export default mathJax3Plugin;
