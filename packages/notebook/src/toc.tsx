// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  INotebookModel, NotebookPanel
} from '@jupyterlab/notebook';

import {
  each
} from '@phosphor/algorithm';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

export
class NotebookTableOfContents extends Widget {
  /**
   * Create a new extension object.
   */
  constructor(notebook: NotebookPanel) {
    super();
    this.addClass('jp-NotebookTableOfContents');
    this._model = notebook.model;
    notebook.contextChanged.connect(() => {
      this._model = notebook.model;
      this._model.contentChanged.connect(() => {
        this.update();
      });
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
    each(this._model.cells, cell => {
      if (cell.type !== 'markdown') {
        return;
      }
      const lines = cell.value.text.split('\n').filter(line => line[0] === '#');
      lines.forEach(line => {
        const level = line.search(/[^#]/);
        const title = line.slice(level);
        headings.push({ title, level });
      });
    });
    return headings;
  }

  private _model: INotebookModel;
}

export
interface IHeading {
  title: string;
  level: number;
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
      return React.createElement(`h${level}`, {}, el.title);
    });

    return (
      listing
    );
  }
}
