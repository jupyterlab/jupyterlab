// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';
import { IMarkdownParser, IRenderMime } from '@jupyterlab/rendermime';
import {
  TableOfContents,
  TableOfContentsFactory,
  TableOfContentsModel,
  TableOfContentsUtils
} from '@jupyterlab/toc';
import { MarkdownDocument } from './widget';

/**
 * Interface describing a Markdown viewer heading.
 */
export interface IMarkdownViewerHeading
  extends TableOfContentsUtils.Markdown.IMarkdownHeading {}

/**
 * Table of content model for Markdown viewer files.
 */
export class MarkdownViewerTableOfContentsModel extends TableOfContentsModel<
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
   * Type of document supported by the model.
   *
   * #### Notes
   * A `data-document-type` attribute with this value will be set
   * on the tree view `.jp-TableOfContents-content[data-document-type="..."]`
   */
  get documentType(): string {
    return 'markdown-viewer';
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
    const headings = TableOfContentsUtils.filterHeadings(
      TableOfContentsUtils.Markdown.getHeadings(content),
      {
        ...this.configuration,
        // Force base number to be equal to 1
        baseNumbering: 1
      }
    );
    return Promise.resolve(headings);
  }
}

/**
 * Table of content model factory for Markdown viewer files.
 */
export class MarkdownViewerTableOfContentsFactory extends TableOfContentsFactory<MarkdownDocument> {
  /**
   * Constructor
   *
   * @param tracker Widget tracker
   * @param parser Markdown parser
   */
  constructor(
    tracker: IWidgetTracker<MarkdownDocument>,
    protected parser: IMarkdownParser | null,
    protected sanitizer: IRenderMime.ISanitizer
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
    const model = new MarkdownViewerTableOfContentsModel(
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
            elementBox.bottom < widgetBox.top
          ) {
            el.scrollIntoView({ block: 'center' });
          }
        } else {
          console.warn(
            'Heading element not found for heading',
            heading,
            'in widget',
            widget
          );
        }
      }
    };

    const onHeadingsChanged = () => {
      if (!this.parser) {
        return;
      }

      // Clear all numbering items
      TableOfContentsUtils.clearNumbering(widget.content.node);

      // Create a new mapping
      headingToElement = new WeakMap<IMarkdownViewerHeading, Element | null>();
      model.headings.forEach(async heading => {
        const elementId = await TableOfContentsUtils.Markdown.getHeadingId(
          this.parser!,
          heading.raw,
          heading.level,
          this.sanitizer
        );

        if (!elementId) {
          return;
        }
        const selector = `h${heading.level}[id="${CSS.escape(elementId)}"]`;

        headingToElement.set(
          heading,
          TableOfContentsUtils.addPrefix(
            widget.content.node,
            selector,
            heading.prefix ?? ''
          )
        );
      });
    };

    void widget.content.ready.then(() => {
      onHeadingsChanged();

      widget.content.rendered.connect(onHeadingsChanged);
      model.activeHeadingChanged.connect(onActiveHeadingChanged);
      model.headingsChanged.connect(onHeadingsChanged);
      widget.disposed.connect(() => {
        widget.content.rendered.disconnect(onHeadingsChanged);
        model.activeHeadingChanged.disconnect(onActiveHeadingChanged);
        model.headingsChanged.disconnect(onHeadingsChanged);
      });
    });

    return model;
  }
}
