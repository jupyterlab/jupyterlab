// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { ISanitizer } from '@jupyterlab/apputils';

import { sanitizerOptions } from '../../utils/sanitizer_options';

import { INotebookHeading } from '../../utils/inotebookheading';

export interface ICodeComponentProps {
  sanitizer: ISanitizer;
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
    // Grab the rendered CodeMirror DOM in the document, show it in TOC.
    let html = this.state.heading.cellRef!.editor.host.innerHTML;
    // Sanitize it to be safe.
    html = this.props.sanitizer.sanitize(html, sanitizerOptions);
    return (
      <div className="cm-toc" dangerouslySetInnerHTML={{ __html: html }} />
    );
  }
}
