// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { AccordionLayout } from '@lumino/widgets';
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

    // Set up drag-to-reorder for the accordion sections.
    if (content instanceof AccordionPanel) {
      this._setupDrag(content as AccordionPanel);
    }

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
    this._addDragHandle(widget);
  }

  /**
   * Insert a widget at the given position in the content panel.
   *
   * @param index Position
   * @param widget Widget to insert
   */
  insertWidget(index: number, widget: Toolbar.IWidgetToolbar): void {
    this.content.insertWidget(index, widget);
    this._addDragHandle(widget);
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

  /**
   * Add a drag handle to the accordion title of a widget.
   */
  private _addDragHandle(widget: Widget): void {
    const accordion = this._content as AccordionPanel;
    if (!(accordion instanceof AccordionPanel)) {
      return;
    }
    const idx = Array.from(accordion.widgets).indexOf(widget);
    if (idx < 0) {
      return;
    }
    const titleEl = accordion.titles[idx];
    if (!titleEl || titleEl.querySelector('.jp-SidePanel-dragHandle')) {
      return;
    }
    const handle = document.createElement('span');
    handle.className = 'jp-SidePanel-dragHandle';
    handle.setAttribute('aria-hidden', 'true');
    handle.title = this._trans.__('Drag to reorder');
    titleEl.prepend(handle);
  }

  /**
   * Set up pointer-based drag-to-reorder for the accordion panel.
   */
  private _setupDrag(accordion: AccordionPanel): void {
    let draggedWidget: Widget | null = null;
    let startY = 0;
    let isDragging = false;

    const indicator = document.createElement('div');
    indicator.className = 'jp-SidePanel-dropIndicator';
    indicator.style.display = 'none';
    accordion.node.appendChild(indicator);

    const getTargetSlot = (clientY: number): number => {
      const layout = accordion.layout as AccordionLayout;
      const titles = Array.from(layout.titles);
      for (let i = 0; i < titles.length; i++) {
        const rect = titles[i].getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          return i;
        }
      }
      return titles.length;
    };

    const showIndicator = (slot: number): void => {
      const layout = accordion.layout as AccordionLayout;
      const titles = Array.from(layout.titles);
      const panelRect = accordion.node.getBoundingClientRect();
      let top: number;
      if (slot < titles.length) {
        top = titles[slot].getBoundingClientRect().top - panelRect.top;
      } else {
        const last = titles[titles.length - 1].getBoundingClientRect();
        top = last.bottom - panelRect.top;
      }
      indicator.style.top = `${top}px`;
      indicator.style.display = 'block';
    };

    const endDrag = (clientY?: number): void => {
      indicator.style.display = 'none';
      accordion.node.classList.remove('jp-mod-dragging');
      if (isDragging && draggedWidget && clientY !== undefined) {
        const currentIdx = Array.from(accordion.widgets).indexOf(draggedWidget);
        const targetSlot = getTargetSlot(clientY);
        const insertIdx = targetSlot > currentIdx ? targetSlot - 1 : targetSlot;
        if (insertIdx !== currentIdx) {
          accordion.insertWidget(insertIdx, draggedWidget);
        }
      }
      draggedWidget = null;
      isDragging = false;
    };

    accordion.node.addEventListener('pointerdown', (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.jp-SidePanel-dragHandle')) {
        return;
      }
      const titleEl = target.closest(
        '.lm-AccordionPanel-title'
      ) as HTMLElement | null;
      if (!titleEl) {
        return;
      }
      const layout = accordion.layout as AccordionLayout;
      const idx = Array.from(layout.titles).indexOf(titleEl);
      if (idx < 0) {
        return;
      }
      draggedWidget = accordion.widgets[idx];
      startY = event.clientY;
      accordion.node.setPointerCapture(event.pointerId);
    });

    accordion.node.addEventListener('pointermove', (event: PointerEvent) => {
      if (!draggedWidget) {
        return;
      }
      if (!isDragging && Math.abs(event.clientY - startY) > 5) {
        isDragging = true;
        accordion.node.classList.add('jp-mod-dragging');
      }
      if (isDragging) {
        showIndicator(getTargetSlot(event.clientY));
      }
    });

    accordion.node.addEventListener('pointerup', (event: PointerEvent) => {
      endDrag(event.clientY);
    });

    accordion.node.addEventListener('pointercancel', () => {
      endDrag();
    });
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
