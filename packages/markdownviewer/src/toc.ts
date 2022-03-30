// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';
import { IMarkdownParser } from '@jupyterlab/rendermime';
import {
  TableOfContents,
  TableOfContentsFactory,
  TableOfContentsModel,
  ToCUtils
} from '@jupyterlab/toc';
import { MarkdownDocument } from './widget';

export interface IMarkdownViewerHeading extends TableOfContents.IHeading {
  element?: Element | null;
}

export class MarkdownViewerToCModel extends TableOfContentsModel<
  IMarkdownViewerHeading,
  MarkdownDocument
> {
  constructor(
    widget: MarkdownDocument,
    protected parser: IMarkdownParser | null,
    configuration?: TableOfContents.IConfig
  ) {
    super(widget, configuration);
  }

  set activeHeading(heading: IMarkdownViewerHeading | null) {
    super.activeHeading = heading;
    if (heading?.element) {
      const widgetBox = this.widget.content.node.getBoundingClientRect();
      const elementBox = heading.element.getBoundingClientRect();

      if (
        elementBox.top > widgetBox.bottom ||
        elementBox.bottom < widgetBox.top ||
        elementBox.left > widgetBox.right ||
        elementBox.right < widgetBox.left
      ) {
        heading.element.scrollIntoView({ inline: 'center' });
      }
    }
  }

  protected get isAlwaysActive(): boolean {
    return true;
  }

  protected getHeadings(): Promise<IMarkdownViewerHeading[] | null> {
    const content = this.widget.context.model.toString();
    const headings = ToCUtils.Markdown.getHeadings(content, this.configuration);
    // Clear all numbering items
    this.widget.content.node
      .querySelectorAll(`span.${ToCUtils.NUMBERING_CLASS}`)
      .forEach(el => {
        el.remove();
      });

    if (this.parser) {
      this.findElement(headings).catch(reason => {
        console.error('Failed to link heading and DOM nodes.', reason);
      });
    }
    return Promise.resolve(headings);
  }

  protected async findElement(
    headings: (ToCUtils.Markdown.IMarkdownHeading & {
      element?: Element | null;
    })[]
  ): Promise<void> {
    await this.widget.content.ready;

    // Process headings in order to deal with multiple identical selectors
    for (const heading of headings) {
      try {
        const innerHTML = await this.parser?.render(heading.raw);

        if (!innerHTML) {
          continue;
        }

        const container = document.createElement('div');
        container.innerHTML = innerHTML;
        // See packages/rendermime/src/renderers.ts::Private.headerAnchors for header id construction
        const elementId = (
          container.querySelector(`h${heading.level}`)?.textContent ?? ''
        ).replace(/ /g, '-');

        if (!elementId) {
          continue;
        }

        const selector = `h${heading.level}[id="${elementId}"]`;

        const element = (heading.element = this.widget.content.node.querySelector(
          selector
        ) as HTMLElement | null);

        if (!element) {
          continue;
        }

        if (!element.querySelector(`span.${ToCUtils.NUMBERING_CLASS}`)) {
          addNumbering(element, heading.prefix ?? '');
        } else {
          // There are likely multiple elements with the same selector
          //  => use the first one without prefix
          const allElements = this.widget.content.node.querySelectorAll(
            selector
          );
          for (const el of allElements) {
            if (!el.querySelector(`span.${ToCUtils.NUMBERING_CLASS}`)) {
              heading.element = el;
              addNumbering(el, heading.prefix ?? '');
              break;
            }
          }
        }
      } catch (reason) {
        console.error('Failed to parse a heading.', reason);
      }
    }

    function addNumbering(el: Element, numbering: string) {
      el.insertAdjacentHTML(
        'afterbegin',
        `<span class="${ToCUtils.NUMBERING_CLASS}">${numbering}</span>`
      );
    }
  }
}

export class MarkdownViewerToCFactory extends TableOfContentsFactory<
  MarkdownDocument
> {
  constructor(
    tracker: IWidgetTracker<MarkdownDocument>,
    protected parser: IMarkdownParser | null
  ) {
    super(tracker);
  }

  /**
   * Create a new table of contents model for the widget
   *
   * @param widget - widget
   * @param configuration - Table of contents configuration
   * @returns The table of contents model
   */
  protected _createNew(
    widget: MarkdownDocument,
    configuration?: TableOfContents.IConfig
  ): TableOfContentsModel<TableOfContents.IHeading, MarkdownDocument> {
    return new MarkdownViewerToCModel(widget, this.parser, configuration);
  }
}
