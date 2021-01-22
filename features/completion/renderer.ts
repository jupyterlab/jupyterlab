// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Completer } from '@jupyterlab/completer';
import { CompletionLabIntegration } from './completion';
import { Signal } from '@lumino/signaling';
import { LazyCompletionItem } from './completion_handler';

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
}

export namespace LSPCompletionRenderer {
  export interface IOptions {
    integrator: CompletionLabIntegration;
  }
}
