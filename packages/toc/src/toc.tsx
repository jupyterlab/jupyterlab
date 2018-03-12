// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {ActivityMonitor, PathExt} from '@jupyterlab/coreutils';

import {IDocumentManager} from '@jupyterlab/docmanager';

import {Message} from '@phosphor/messaging';

import {Widget} from '@phosphor/widgets';

import {TableOfContentsRegistry} from './registry';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

/**
 * Timeout for throttling TOC rendering.
 */
const RENDER_TIMEOUT = 1000;

/**
 * A widget for hosting a notebook table-of-contents.
 */
export class TableOfContents extends Widget {
  /**
   * Create a new table of contents.
   */
  constructor(docmanager: IDocumentManager) {
    super();
    this._docmanager = docmanager;
  }

  /**
   * The current widget-generator tuple for the ToC.
   */
  get current(): TableOfContents.ICurrentWidget {
    return this._current;
  }
  set current(value: TableOfContents.ICurrentWidget) {
    // If they are the same as previously, do nothing.
    if (
      this._current &&
      this._current.widget === value.widget &&
      this._current.generator === value.generator
    ) {
      return;
    }
    this._current = value;

    // Dispose an old activity monitor if it existsd
    if (this._monitor) {
      this._monitor.dispose();
      this._monitor = null;
    }
    // If we are wiping the ToC, update and return.
    if (!this._current) {
      this.update();
      return;
    }

    // Find the document model associated with the widget.
    const context = this._docmanager.contextForWidget(this._current.widget);
    if (!context || !context.model) {
      throw Error('Could not find a context for the Table of Contents');
    }

    // Throttle the rendering rate of the table of contents.
    this._monitor = new ActivityMonitor({
      signal: context.model.contentChanged,
      timeout: RENDER_TIMEOUT,
    });
    this._monitor.activityStopped.connect(this.update, this);
    this.update();
  }

  /**
   * Handle an update request.
   */
  protected onUpdateRequest(msg: Message): void {
    // Don't bother if the TOC is not visible
    if (!this.isVisible) {
      return;
    }

    let toc: IHeading[] = [];
    let title = 'Table of Contents';
    if (this._current) {
      toc = this._current.generator.generate(this._current.widget);
      const context = this._docmanager.contextForWidget(this._current.widget);
      if (context) {
        title = PathExt.basename(context.localPath);
      }
    }
    ReactDOM.render(<TOCTree title={title} toc={toc} />, this.node);
  }

  /**
   * Rerender after showing.
   */
  protected onAfterShow(msg: Message): void {
    this.update();
  }

  private _docmanager: IDocumentManager;
  private _current: TableOfContents.ICurrentWidget | null;
  private _monitor: ActivityMonitor<any, any> | null;
}

/**
 * A namespace for TableOfContents statics.
 */
export namespace TableOfContents {
  /**
   * A type representing a tuple of a widget,
   * and a generator that knows how to generate
   * heading information from that widget.
   */
  export interface ICurrentWidget<W extends Widget = Widget> {
    widget: W;
    generator: TableOfContentsRegistry.IGenerator<W>;
  }
}

/**
 * An object that represents a markdown heading.
 */
export interface IHeading {
  /**
   * The text of the heading.
   */
  text: string;

  /**
   * The HTML header level for the heading.
   */
  level: number;

  /**
   * A function to execute when clicking the ToC
   * item. Typically this will be used to scroll
   * the parent widget to this item.
   */
  onClick: () => void;
}

/**
 * Props for the TOCTree component.
 */
export interface ITOCTreeProps extends React.Props<TOCTree> {
  /**
   * A title to display.
   */
  title: string;

  /**
   * A list of IHeadings to render.
   */
  toc: IHeading[];
}

/**
 * Props for the TOCItem component.
 */
export interface ITOCItemProps extends React.Props<TOCItem> {
  /**
   * An IHeading to render.
   */
  heading: IHeading;
}

/**
 * A React component for a table of contents entry.
 */
export class TOCItem extends React.Component<ITOCItemProps, {}> {
  /**
   * Render the item.
   */
  render() {
    const heading = this.props.heading;
    let level = Math.round(heading.level);

    // Clamp the header level between 1 and six.
    level = Math.max(Math.min(level, 6), 1);

    // Create an onClick handler for the TOC item
    // that scrolls the anchor into view.
    const clickHandler = (evt: MouseEvent) => {
      evt.preventDefault();
      evt.stopPropagation();
      heading.onClick();
    };

    return React.createElement(
      `h${level}`,
      {onClick: clickHandler},
      <a href="">{heading.text}</a>,
    );
  }
}

/**
 * A React component for a table of contents.
 */
export class TOCTree extends React.Component<ITOCTreeProps, {}> {
  /**
   * Render the TOCTree.
   */
  render() {
    // Map the heading objects onto a list of JSX elements.
    let i = 0;
    let listing: JSX.Element[] = this.props.toc.map(el => {
      return <TOCItem heading={el} key={`${el.text}-${el.level}-${i++}`} />;
    });

    // Return the JSX component.
    return (
      <div className="jp-TableOfContents">
        <div className="jp-TableOfContents-header">
          <h1>{this.props.title}</h1>
        </div>
        <div className="jp-TableOfContents-content">{listing}</div>
      </div>
    );
  }
}
