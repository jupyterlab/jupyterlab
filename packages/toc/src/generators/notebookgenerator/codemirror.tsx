import * as React from 'react';

import { INotebookHeading } from '../shared';

export interface CodeComponentProps {
  heading: INotebookHeading;
}

export interface CodeComponentState {
  heading: INotebookHeading;
}

export class CodeComponent extends React.Component<
  CodeComponentProps,
  CodeComponentState
> {
  constructor(props: CodeComponentState) {
    super(props);
    this.state = { heading: props.heading };
  }

  componentWillReceiveProps(nextProps: CodeComponentState) {
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
          dangerouslySetInnerHTML={{ __html: node[0].children[1].innerHTML }}
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
