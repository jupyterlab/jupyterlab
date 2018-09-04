// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { INotebookHeading } from '../shared';

export interface ICodeComponentProps {
  heading: INotebookHeading;
}

export interface ICodeComponentState {
  heading: INotebookHeading;
}

export class CodeComponent extends React.Component<
  ICodeComponentProps,
  ICodeComponentState
> {
  constructor(props: ICodeComponentProps) {
    super(props);
    this.state = { heading: props.heading };
  }

  componentWillReceiveProps(nextProps: ICodeComponentProps) {
    this.setState({ heading: nextProps.heading });
  }

  render() {
    // Grab the rendered CodeMirror DOM in the document, show it in TOC
    let node = this.state.heading.cellRef!.node.querySelectorAll(
      '.jp-InputArea.jp-Cell-inputArea'
    );
    if (node != null && node.length > 0 && node[0] != null) {
      return (
        <div
          className="cm-toc"
          dangerouslySetInnerHTML={{
            __html: this.state.heading.cellRef!.editor.host.innerHTML
          }}
        />
      );
    }
    return (
      <div>
        <div className="cm-toc-plain-textarea">
          <span className="cm-toc-plain-span">{this.state.heading.text!}</span>
        </div>
      </div>
    );
  }
}
