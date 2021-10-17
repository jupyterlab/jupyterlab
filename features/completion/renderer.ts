// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Completer } from '@jupyterlab/completer';
import { IRenderMime } from '@jupyterlab/rendermime';
import { Signal } from '@lumino/signaling';

import { ILSPLogConsole } from '../../tokens';

import { CompletionLabIntegration } from './completion';
import { LazyCompletionItem } from './item';

export interface ICompletionData {
  item: LazyCompletionItem;
  element: HTMLLIElement;
}

export class LSPCompletionRenderer
  extends Completer.Renderer
  implements Completer.IRenderer
{
  // signals
  public activeChanged: Signal<LSPCompletionRenderer, ICompletionData>;
  public itemShown: Signal<LSPCompletionRenderer, ICompletionData>;
  // observers
  private visibilityObserver: IntersectionObserver;
  private activityObserver: MutationObserver;
  // element data maps (with weak references for better GC)
  private elementToItem: WeakMap<HTMLLIElement, LazyCompletionItem>;
  private wasActivated: WeakMap<HTMLLIElement, boolean>;

  protected ITEM_PLACEHOLDER_CLASS = 'lsp-detail-placeholder';
  protected EXTRA_INFO_CLASS = 'jp-Completer-typeExtended';

  constructor(protected options: LSPCompletionRenderer.IOptions) {
    super();
    this.activeChanged = new Signal(this);
    this.itemShown = new Signal(this);
    this.elementToItem = new WeakMap();
    this.wasActivated = new WeakMap();

    this.visibilityObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            return;
          }
          let li = entry.target as HTMLLIElement;
          let item = this.elementToItem.get(li);
          this.itemShown.emit({
            item: item,
            element: li
          });
        });
      },
      {
        threshold: 0.25
      }
    );

    // note: there should be no need to unobserve deleted elements as per:
    // https://stackoverflow.com/a/51106262/6646912
    this.activityObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        let li = mutation.target;
        if (!(li instanceof HTMLLIElement)) {
          return;
        }
        let inactive = !this.wasActivated.get(li);

        if (li.classList.contains('jp-mod-active')) {
          if (inactive) {
            this.wasActivated.set(li, true);
            let item = this.elementToItem.get(li);
            this.activeChanged.emit({
              item: item,
              element: li
            });
          }
        } else {
          this.wasActivated.set(li, false);
        }
      });
    });
  }

  protected getExtraInfo(item: LazyCompletionItem): string {
    const labelExtra = this.options.integrator.settings.composite.labelExtra;
    switch (labelExtra) {
      case 'detail':
        return item?.detail;
      case 'type':
        return item?.type?.toLowerCase?.();
      case 'source':
        return item?.source?.name;
      case 'auto':
        return [
          item?.detail,
          item?.type?.toLowerCase?.(),
          item?.source?.name
        ].filter(x => !!x)[0];
      default:
        this.options.console.warn(
          'labelExtra does not match any of the expected values',
          labelExtra
        );
    }
  }

  public updateExtraInfo(item: LazyCompletionItem, li: HTMLLIElement) {
    const extraText = this.getExtraInfo(item);
    if (extraText) {
      const extraElement = li.getElementsByClassName(this.EXTRA_INFO_CLASS)[0];
      extraElement.textContent = extraText;
    }
  }

  createCompletionItemNode(
    item: LazyCompletionItem,
    orderedTypes: string[]
  ): HTMLLIElement {
    const li = super.createCompletionItemNode(item, orderedTypes);

    // make sure that an instance reference, and not an object copy is being used;
    const lsp_item = item.self;

    // only monitor nodes that have item.self as others are not our completion items
    if (lsp_item) {
      lsp_item.element = li;
      this.elementToItem.set(li, lsp_item);
      this.activityObserver.observe(li, {
        attributes: true,
        attributeFilter: ['class']
      });
      this.visibilityObserver.observe(li);
      // TODO: build custom li from ground up
      this.updateExtraInfo(lsp_item, li);
    } else {
      this.updateExtraInfo(item, li);
    }

    return li;
  }

  createDocumentationNode(item: LazyCompletionItem): HTMLElement {
    // note: not worth trying to `fetchDocumentation()` as this is not
    // invoked if documentation is empty (as of jlab 3.2)
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
