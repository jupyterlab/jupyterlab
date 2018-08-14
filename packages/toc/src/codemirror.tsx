import * as React from 'react';

import * as CodeMirror from 'codemirror';
import { INotebookHeading } from './generators';

export interface CodeComponentProps {
  code: string;
  theme: string;
}

export interface CodeComponentState {
  code: string;
}

export class CodeComponent extends React.Component<
  CodeComponentProps,
  CodeComponentState
> {
  constructor(props: CodeComponentProps) {
    super(props);
    this.state = { code: props.code };
  }

  componentWillReceiveProps(nextProps: CodeComponentProps) {
    this.setState({ code: nextProps.code });
    if (this.codeMirror) {
      this.codeMirror.refresh();
    }
  }

  componentDidMount() {
    /* this.codeMirror = CodeMirror.fromTextArea(
      this.refs.editor as HTMLTextAreaElement,
      {
        theme: this.props.theme,
        showCursorWhenSelecting: false,
        readOnly: 'true',
        cursorBlinkRate: -1,
        lineWrapping: true
      }
    );
    if (this.codeMirror) {
    } */
  }

  render() {
    return (
      <div className="cm-toc">
        <textarea
          ref="editor"
          autoComplete="off"
          defaultValue={this.state.code}
        />
      </div>
    );
  }

  private codeMirror: CodeMirror.EditorFromTextArea | null = null;
}

export interface ExperimentalCodeComponentProps {
  heading: INotebookHeading;
}

export interface ExperimentalCodeComponentState {
  heading: INotebookHeading;
}

export class ExperimentalCodeComponent extends React.Component<
  ExperimentalCodeComponentProps,
  ExperimentalCodeComponentState
> {
  constructor(props: ExperimentalCodeComponentState) {
    super(props);
    this.state = { heading: props.heading };
  }

  componentWillReceiveProps(nextProps: ExperimentalCodeComponentState) {
    this.setState({ heading: nextProps.heading });
    /* if (this.codeMirror) {
      this.codeMirror.refresh();
    } */
  }

  componentDidMount() {
    /* this.codeMirror = CodeMirror.fromTextArea(
      this.refs.editor as HTMLTextAreaElement,
      {
        theme: this.props.theme,
        showCursorWhenSelecting: false,
        readOnly: 'true',
        cursorBlinkRate: -1,
        lineWrapping: true
      }
    );
    if (this.codeMirror) {
    } */
  }

  render() {
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
