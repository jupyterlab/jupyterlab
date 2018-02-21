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

export
class NotebookTableOfContents extends Widget {
  /**
   * Create a new extension object.
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

  private _generateTOC(): IHeading[] {
    let headings: IHeading[] = [];
    each(this._notebook.widgets, cell => {
      let model = cell.model;
      if (model.type !== 'markdown') {
        return;
      }
      const lines = model.value.text.split('\n').filter(line => line[0] === '#');
      lines.forEach(line => {
        const level = line.search(/[^#]/);
        const title = line.slice(level);
        headings.push({ title, level, anchor: cell.node });
      });
    });
    return headings;
  }

  private _notebook: Notebook;
}

export
interface IHeading {
  title: string;
  level: number;
  anchor: HTMLElement;
}

export
interface ITOCTreeProps extends React.Props<TOCTree> {
  toc: IHeading[];
}

export
class TOCTree extends React.Component<ITOCTreeProps, {}> {

  render() {
    let listing: JSX.Element[] = this.props.toc.map( el => {
      let level = Math.round(el.level);
      level = (level > 0 && level < 7) ? level : 6;
      const clickHandler = (evt: MouseEvent) => {
        evt.preventDefault();
        el.anchor.scrollIntoView();
      };

      return React.createElement(`h${level}`, { onClick: clickHandler },
        <a href=''>{ el.title }</a>);
    });

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
