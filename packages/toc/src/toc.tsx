// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ActivityMonitor, PathExt } from '@jupyterlab/coreutils';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { Message } from '@phosphor/messaging';

import { each } from '@phosphor/algorithm';

import { Widget } from '@phosphor/widgets';

import { TableOfContentsRegistry } from './registry';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { INotebookTracker } from '@jupyterlab/notebook';

/**
 * Timeout for throttling TOC rendering.
 */
const RENDER_TIMEOUT = 1000;
const NEED_NUMBERING_BY_DEFAULT = true;

/**
 * A widget for hosting a notebook table-of-contents.
 */
export class TableOfContents extends Widget {
  /**
   * Create a new table of contents.
   */
  constructor(options: TableOfContents.IOptions) {
    super();
    this._docmanager = options.docmanager;
    this._rendermime = options.rendermime;
    this._notebook = options.notebookTracker;
  }

  /**
   * The current widget-generator tuple for the ToC.
   */
  get current(): TableOfContents.ICurrentWidget | null {
    return this._current;
  }
  set current(value: TableOfContents.ICurrentWidget | null) {
    // If they are the same as previously, do nothing.
    if (
      value &&
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
      timeout: RENDER_TIMEOUT
    });
    this._monitor.activityStopped.connect(
      this.update,
      this
    );
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
    ReactDOM.render(
      <TOCTree widget={this} title={title} toc={toc} />,
      this.node,
      () => {
        if (
          this._current &&
          this._current.generator.usesLatex === true &&
          this._rendermime.latexTypesetter
        ) {
          this._rendermime.latexTypesetter.typeset(this.node);
        }
      }
    );
  }

  private changeNumberingStateForAllCells(showNumbering: boolean) {
    if (this._notebook.currentWidget) {
      each(this._notebook.currentWidget.content.widgets, cell => {
        let headingNodes = cell.node.querySelectorAll('h1, h2, h3, h4, h5, h6');
        each(headingNodes, heading => {
          if (heading.getElementsByClassName('numbering-entry').length > 0) {
            if (!showNumbering) {
              heading
                .getElementsByClassName('numbering-entry')[0]
                .setAttribute('hidden', 'true');
            } else {
              heading
                .getElementsByClassName('numbering-entry')[0]
                .removeAttribute('hidden');
            }
          }
        });
      });
    }
  }

  /**
   * Rerender after showing.
   */
  protected onAfterShow(msg: Message): void {
    this.update();
  }

  get needNumbering() {
    return this._needNumbering;
  }

  set needNumbering(value: boolean) {
    this._needNumbering = value;
    this.changeNumberingStateForAllCells(value);
  }

  private _needNumbering = NEED_NUMBERING_BY_DEFAULT;
  private _notebook: INotebookTracker;
  private _rendermime: IRenderMimeRegistry;
  private _docmanager: IDocumentManager;
  private _current: TableOfContents.ICurrentWidget | null;
  private _monitor: ActivityMonitor<any, any> | null;
}

/**
 * A namespace for TableOfContents statics.
 */
export namespace TableOfContents {
  /**
   * Options for the constructor.
   */
  export interface IOptions {
    /**
     * The document manager for the application.
     */
    docmanager: IDocumentManager;

    /**
     * The rendermime for the application.
     */
    rendermime: IRenderMimeRegistry;
    notebookTracker: INotebookTracker;
  }

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
 * An object that represents a heading.
 */
export interface IHeading {
  /**
   * The text of the heading.
   */
  text: string | null;

  /**
   * The HTML header level for the heading.
   */
  level: number;

  numbering?: string | null;

  /**
   * A function to execute when clicking the ToC
   * item. Typically this will be used to scroll
   * the parent widget to this item.
   */
  onClick: () => void;

  /**
   * If there is special markup, we can instead
   * render the heading using a raw HTML string. This
   * HTML *should be properly sanitized!*
   *
   * For instance, this can be used to render
   * already-renderd-to-html markdown headings.
   */
  html?: string | null;
  type: string;
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
  widget: TableOfContents;
}

/**
 * Props for the TOCItem component.
 */
export interface ITOCItemProps extends React.Props<TOCItem> {
  /**
   * An IHeading to render.
   */
  heading: IHeading;
  needNumbering: boolean;
}

export interface ITOCItemStates {
  needNumbering: boolean;
}

/**
 * A React component for a table of contents entry.
 */
export class TOCItem extends React.Component<ITOCItemProps, ITOCItemStates> {
  constructor(props: ITOCItemProps) {
    super(props);
    this.state = { needNumbering: this.props.needNumbering };
  }

  componentWillReceiveProps(nextProps: ITOCItemProps) {
    this.setState({ needNumbering: nextProps.needNumbering });
  }

  /**
   * Render the item.
   */
  render() {
    const { heading } = this.props;

    let level = Math.round(heading.level);
    // Clamp the header level between 1 and six.
    level = Math.max(Math.min(level, 6), 1);

    const paddingLeft = (level - 1) * 12;

    // Create an onClick handler for the TOC item
    // that scrolls the anchor into view.
    const handleClick = (event: React.SyntheticEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      heading.onClick();
    };

    let content;
    let numbering =
      heading.numbering && this.state.needNumbering ? heading.numbering : '';
    if (heading.html) {
      content = (
        <span
          dangerouslySetInnerHTML={{ __html: numbering + heading.html }}
          style={{ paddingLeft }}
        />
      );
    } else {
      // let collapse = this.props.children ? (
      //   <img src={require('../static/rightarrow.svg')} />
      // ) : "";
      content = <span style={{ paddingLeft }}>{numbering + heading.text}</span>;
    }

    return <li onClick={handleClick}>{content}</li>;
  }
}

export interface ITOCTreeStates {
  needNumbering: boolean;
}

/**
 * A React component for a table of contents.
 */
export class TOCTree extends React.Component<ITOCTreeProps, ITOCTreeStates> {
  /**
   * Render the TOCTree.
   */

  constructor(props: ITOCTreeProps) {
    super(props);
    this.state = { needNumbering: this.props.widget.needNumbering };
  }

  render() {
    // Map the heading objects onto a list of JSX elements.
    let i = 0;
    let listing: JSX.Element[] = this.props.toc.map(el => {
      return (
        <TOCItem
          needNumbering={this.state.needNumbering}
          heading={el}
          key={`${el.text}-${el.level}-${i++}`}
        />
      );
    });

    const handleClick = (event: React.SyntheticEvent<HTMLButtonElement>) => {
      this.props.widget.needNumbering = !this.props.widget.needNumbering;
      this.setState({ needNumbering: this.props.widget.needNumbering });
    };

    // Return the JSX component.
    return (
      <div className="jp-TableOfContents">
        <header>{this.props.title}</header>
        <button onClick={event => handleClick(event)}>
          Show/Hide Numbering
        </button>
        <ul className="jp-TableOfContents-content">{listing}</ul>
      </div>
    );
  }
}
