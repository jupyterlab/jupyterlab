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

/**
 * Interface describing a Markdown viewer heading.
 */
export interface IMarkdownViewerHeading
  extends ToCUtils.Markdown.IMarkdownHeading {}

/**
 * Table of content model for Markdown viewer files.
 */
export class MarkdownViewerToCModel extends TableOfContentsModel<
  IMarkdownViewerHeading,
  MarkdownDocument
> {
  /**
   * Constructor
   *
   * @param widget The widget to search in
   * @param parser Markdown parser
   * @param configuration Default model configuration
   */
  constructor(
    widget: MarkdownDocument,
    protected parser: IMarkdownParser | null,
    configuration?: TableOfContents.IConfig
  ) {
    super(widget, configuration);
  }

  /**
   * Whether the model gets updated even if the table of contents panel
   * is hidden or not.
   */
  protected get isAlwaysActive(): boolean {
    return true;
  }

  /**
   * List of configuration options supported by the model.
   */
  get supportedOptions(): (keyof TableOfContents.IConfig)[] {
    return ['maximalDepth', 'numberingH1', 'numberHeaders'];
  }

  /**
   * Produce the headings for a document.
   *
   * @returns The list of new headings or `null` if nothing needs to be updated.
   */
  protected getHeadings(): Promise<IMarkdownViewerHeading[] | null> {
    const content = this.widget.context.model.toString();
    const headings = ToCUtils.Markdown.getHeadings(content, this.configuration);
    return Promise.resolve(headings);
  }
}

/**
 * Table of content model factory for Markdown viewer files.
 */
export class MarkdownViewerToCFactory extends TableOfContentsFactory<
  MarkdownDocument
> {
  /**
   * Constructor
   *
   * @param tracker Widget tracker
   * @param parser Markdown parser
   */
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
    const model = new MarkdownViewerToCModel(
      widget,
      this.parser,
      configuration
    );

    let headingToElement = new WeakMap<
      IMarkdownViewerHeading,
      Element | null
    >();

    const onActiveHeadingChanged = (
      model: TableOfContentsModel<IMarkdownViewerHeading, MarkdownDocument>,
      heading: IMarkdownViewerHeading | null
    ) => {
      if (heading) {
        const el = headingToElement.get(heading);

        if (el) {
          const widgetBox = widget.content.node.getBoundingClientRect();
          const elementBox = el.getBoundingClientRect();

          if (
            elementBox.top > widgetBox.bottom ||
            elementBox.bottom < widgetBox.top ||
            elementBox.left > widgetBox.right ||
            elementBox.right < widgetBox.left
          ) {
            el.scrollIntoView({ inline: 'center' });
          }
        }
      }
    };

    const onHeadingsChanged = (
      model: TableOfContentsModel<IMarkdownViewerHeading, MarkdownDocument>
    ) => {
      if (!this.parser) {
        return;
      }

      // Clear all numbering items
      ToCUtils.clearNumbering(widget.content.node);

      // Create a new mapping
      headingToElement = new WeakMap<IMarkdownViewerHeading, Element | null>();
      model.headings.forEach(async heading => {
        const elementId = await ToCUtils.Markdown.getHeadingId(
          this.parser!,
          heading.raw,
          heading.level
        );

        if (!elementId) {
          return;
        }
        const selector = `h${heading.level}[id="${elementId}"]`;

        headingToElement.set(
          heading,
          ToCUtils.addPrefix(
            widget.content.node,
            selector,
            heading.prefix ?? ''
          )
        );
      });
    };

    widget.content.ready.then(() => {
      onHeadingsChanged(model);

      model.activeHeadingChanged.connect(onActiveHeadingChanged);
      model.headingsChanged.connect(onHeadingsChanged);
      widget.disposed.connect(() => {
        model.activeHeadingChanged.disconnect(onActiveHeadingChanged);
        model.headingsChanged.disconnect(onHeadingsChanged);
      });
    });

    return model;
  }
}
