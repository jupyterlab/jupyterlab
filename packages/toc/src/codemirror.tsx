import * as React from 'react';

const CodeMirror = require('codemirror');

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
  }

  componentDidMount() {
    this.codeMirror = CodeMirror.fromTextArea(this.refs.editor, {
      theme: this.props.theme,
      showCursorWhenSelecting: false,
      readOnly: 'true',
      cursorBlinkRate: -1,
      lineWrapping: true,
      scrollbarStyle: 'null'
    });
    if (this.codeMirror) {
    }
    console.log('hello world');
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

  private codeMirror: any = null;

  /* render() {
    const options = {
      theme: this.props.theme,
      showCursorWhenSelecting: false,
      readOnly: 'true',
      cursorBlinkRate: -1,
      lineWrapping: true,
      scrollbarStyle: 'null'
    };
    return (
      <CodeMirror
        className={'cm-toc'}
        value={this.state.code}
        options={options}
      />
    );
    const codeMirror = new CodeMirror.fromTe
  } */
}
