// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { AccordionPanel, Panel, PanelLayout, Widget } from '@lumino/widgets';
import { AccordionToolbar } from './accordiontoolbar';
import { Toolbar } from './toolbar';

/**
 * A widget meant to be contained in sidebars.
 *
 * #### Note
 * By default the content widget is an accordion panel that supports widget with
 * associated toolbar to be displayed in the widget title.
 */
export class SidePanel extends Widget {
  constructor(options: SidePanel.IOptions = {}) {
    super();
    const layout = (this.layout = new PanelLayout());
    this.addClass('jp-SidePanel');

    const trans = (this._trans = (options.translator || nullTranslator).load(
      'jupyterlab'
    ));

    if (options.header) {
      this.addHeader(options.header);
    }

    const content = (this._content =
      options.content ??
      new AccordionPanel({
        ...options,
        layout: AccordionToolbar.createLayout(options)
      }));
    content.node.setAttribute('role', 'region');
    content.node.setAttribute('aria-label', trans.__('side panel content'));
    content.addClass('jp-SidePanel-content');
    layout.addWidget(content);

    if (options.toolbar) {
      this.addToolbar(options.toolbar);
    }
  }

  /**
   * The content hosted by the widget.
   */
  get content(): Panel {
    return this._content;
  }

  /**
   * A panel for widgets that sit on top of the widget.
   */
  get header(): Panel {
    if (!this._header) {
      this.addHeader();
    }
    return this._header;
  }

  /**
   * The toolbar hosted by the widget.
   *
   * It sits between the header and the content
   */
  get toolbar(): Toolbar {
    if (!this._toolbar) {
      this.addToolbar();
    }
    return this._toolbar;
  }

  /**
   * A read-only array of the widgets in the content panel.
   */
  get widgets(): ReadonlyArray<Widget> {
    return this.content.widgets;
  }

  /**
   * Add a widget to the content panel bottom.
   *
   * @param widget Widget to add
   */
  addWidget(widget: Toolbar.IWidgetToolbar): void {
    this.content.addWidget(widget);
  }

  /**
   * Insert a widget at the given position in the content panel.
   *
   * @param index Position
   * @param widget Widget to insert
   */
  insertWidget(index: number, widget: Toolbar.IWidgetToolbar): void {
    this.content.insertWidget(index, widget);
  }

  private addHeader(header?: Panel) {
    const theHeader = (this._header = header || new Panel());
    theHeader.addClass('jp-SidePanel-header');

    (this.layout as PanelLayout).insertWidget(0, theHeader);
  }

  private addToolbar(toolbar?: Toolbar) {
    const theToolbar = (this._toolbar = toolbar ?? new Toolbar());
    theToolbar.addClass('jp-SidePanel-toolbar');
    (this.layout as PanelLayout).insertWidget(
      (this.layout as PanelLayout).widgets.length - 1,
      theToolbar
    );
  }

  protected _content: Panel;
  protected _header: Panel;
  protected _toolbar: Toolbar;
  protected _trans: TranslationBundle;
}

/**
 * The namespace for the `SidePanel` class statics.
 */
export namespace SidePanel {
  /**
   * An options object for creating a side panel widget.
   */
  export interface IOptions extends AccordionPanel.IOptions {
    /**
     * The main child of the side panel
     *
     * If nothing is provided it fallback to an AccordionToolbar panel.
     */
    content?: Panel;

    /**
     * The header is at the top of the SidePanel,
     * and that extensions can populate.
     *
     * Defaults to an empty Panel if requested otherwise it won't be created.
     */
    header?: Panel;

    /**
     * The toolbar to use for the widget.
     * It sits between the header and the content
     *
     * Defaults to an empty toolbar if requested otherwise it won't be created.
     */
    toolbar?: Toolbar;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}
