import * as React from 'react';

const CodeMirror = require('react-codemirror');

export interface CodeComponentProps {
  code: string;
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

  render() {
    const options = {
      theme: 'jupyter',
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
  }
}
