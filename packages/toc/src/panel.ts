import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ITranslator } from '@jupyterlab/translation';
import { SidePanel } from '@jupyterlab/ui-components';
import { each } from '@lumino/algorithm';
import { Panel, Widget } from '@lumino/widgets';
import { TableOfContentsWidget } from './treeview';
import { TableOfContents } from './tokens';

export class TableOfContentsPanel extends SidePanel {
  constructor(rendermime: IRenderMimeRegistry, translator?: ITranslator) {
    super({ content: new Panel(), translator });
    this._model = null;

    this.addClass('jp-TableOfContents');

    this._title = new Private.Header(this._trans.__('Table of Contents'));
    this.header.addWidget(this._title);

    this._treeview = new TableOfContentsWidget({
      rendermime
    });
    this.content.addWidget(this._treeview);
  }

  /**
   * Get the current model.
   */
  get model(): TableOfContents.IModel | null {
    return this._model;
  }
  set model(newValue: TableOfContents.IModel | null) {
    if (this._model !== newValue) {
      this._model = newValue;

      this._title.setTitle(
        this._model?.title ?? this._trans.__('Table of Contents')
      );
      // Clear the current toolbar
      each(this._toolbar.children(), item => {
        item.parent = null;
      });
      // Add the new items
      if (this._model?.toolbarItems) {
        each(this._model.toolbarItems.iter(), item => {
          this._toolbar.addItem(item.name, item.widget);
        });
      }

      this._treeview.model = this._model;
    }
  }

  private _model: TableOfContents.IModel | null;
  private _title: Private.Header;
  private _treeview: TableOfContentsWidget;
}

namespace Private {
  export class Header extends Widget {
    constructor(title: string) {
      const node = document.createElement('h2');
      node.textContent = title;
      node.classList.add('jp-left-truncated');
      super({ node });
      this._title = node;
    }

    setTitle(title: string): void {
      this._title.textContent = title;
    }

    private _title: HTMLElement;
  }
}
