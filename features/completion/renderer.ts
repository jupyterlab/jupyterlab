// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Completer } from '@jupyterlab/completer';
import { CompletionLabIntegration } from './completion';
import { Signal } from '@lumino/signaling';
import { LazyCompletionItem } from './completion_handler';
import { IRenderMime } from '@jupyterlab/rendermime';
import { ILSPLogConsole } from '../../tokens';

export class LSPCompletionRenderer
  extends Completer.Renderer
  implements Completer.IRenderer {
  public activeChanged: Signal<LSPCompletionRenderer, LazyCompletionItem>;

  constructor(protected options: LSPCompletionRenderer.IOptions) {
    super();
    this.activeChanged = new Signal(this);
  }

  createCompletionItemNode(
    item: LazyCompletionItem,
    orderedTypes: string[]
  ): HTMLLIElement {
    const li = super.createCompletionItemNode(item, orderedTypes);

    // make sure that an instance reference, and not an object copy is being used;
    item = item.self;

    // only monitor nodes that have item.self as others are not LazyCompletionItems
    // and only monitor those that need documentation retrieval
    if (item && !item.documentation) {
      let inactive = true;
      const observer = new MutationObserver(mutations => {
        if (li.classList.contains('jp-mod-active')) {
          if (inactive) {
            inactive = false;
            this.activeChanged.emit(item);
          }
        } else {
          inactive = true;
        }
      });
      observer.observe(li, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return li;
  }

  createDocumentationNode(item: LazyCompletionItem): HTMLElement {
    if (item.isDocumentationMarkdown) {
      let documentation = item.documentation;
      this.options.markdownRenderer
        .renderModel({
          data: {
            'text/markdown': documentation
          },
          trusted: false,
          metadata: {},
          setData(options: IRenderMime.IMimeModel.ISetDataOptions) {
            // empty
          }
        })
        .then(() => {
          if (this.options.latexTypesetter && documentation.includes('$')) {
            this.options.latexTypesetter.typeset(
              this.options.markdownRenderer.node
            );
          }
        })
        .catch(this.options.console.warn);
      return this.options.markdownRenderer.node;
    } else {
      let node = document.createElement('pre');
      node.textContent = item.documentation;
      return node;
    }
  }
}

export namespace LSPCompletionRenderer {
  export interface IOptions {
    integrator: CompletionLabIntegration;
    markdownRenderer: IRenderMime.IRenderer;
    latexTypesetter?: IRenderMime.ILatexTypesetter;
    console: ILSPLogConsole;
  }
}
