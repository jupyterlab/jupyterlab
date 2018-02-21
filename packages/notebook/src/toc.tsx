// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from '@phosphor/algorithm';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  Notebook
} from './widget';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

/**
 * A widget for hosting a notebook table-of-contents.
 */
export
class NotebookTableOfContents extends Widget {
  /**
   * Create a new table of contents.
   */
  constructor(notebook: Notebook) {
    super();
    this.addClass('jp-NotebookTableOfContents');
    this._notebook = notebook;
    notebook.modelChanged.connect((nb, args) => {
      notebook.model.contentChanged.connect(this.update, this);
    });
  }

  /**
   * Handle an update request.
   */
  protected onUpdateRequest(msg: Message): void {
    const toc = this._generateTOC();
    ReactDOM.render(<TOCTree toc={toc}/>, this.node);
  }

  /**
   * Rerender after showing.
   */
  protected onAfterShow(msg: Message): void {
    this.update();
  }

  private _generateTOC(): IHeading[] {
    // Don't bother if the TOC is not visible
    if (!this.isVisible) {
      return;
    }

    let headings: IHeading[] = [];
    each(this._notebook.widgets, cell => {
      let model = cell.model;
      if (model.type !== 'markdown') {
        return;
      }
      const lines = model.value.text.split('\n').filter(line => line[0] === '#');
      lines.forEach(line => {
        const level = line.search(/[^#]/);
        const text = line.slice(level);
        headings.push({ text, level, anchor: cell.node });
      });
    });
    return headings;
  }

  private _notebook: Notebook;
}

/**
 * An object that represents a markdown heading.
 */
export
interface IHeading {
  /**
   * The text of the heading.
   */
  text: string;

  /**
   * The HTML header level for the heading.
   */
  level: number;

  /**
   * An HTML element to scroll into view when the
   * TOC item is clicked.
   */
  anchor: HTMLElement;
}

/**
 * Props for the TOCTree component.
 */
export
interface ITOCTreeProps extends React.Props<TOCTree> {
  /**
   * A list of IHeadings to render.
   */
  toc: IHeading[];
}

/**
 * A React component for a table of contents.
 */
export
class TOCTree extends React.Component<ITOCTreeProps, {}> {
  /**
   * Render the TOCTree.
   */
  render() {
    // Map the heading objects onto a list of JSX elements.
    let listing: JSX.Element[] = this.props.toc.map( el => {
      let level = Math.round(el.level);

      // Clamp the header level between 1 and six.
      level = Math.max(Math.min(level, 6), 1);

      // Create an onClick handler for the TOC item
      // that scrolls the anchor into view.
      const clickHandler = (evt: MouseEvent) => {
        evt.preventDefault();
        el.anchor.scrollIntoView();
      };

      return React.createElement(`h${level}`, { onClick: clickHandler },
        <a href=''>{ el.text }</a>);
    });

    // Return the JSX component.
    return (
      <div>
        <div className='jp-NotebookTableOfContents-header'>
          <h1>Table of Contents</h1>
        </div>
       { listing }
      </div>
    );
  }
}
