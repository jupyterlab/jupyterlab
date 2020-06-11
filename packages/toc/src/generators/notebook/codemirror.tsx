// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { ISanitizer } from '@jupyterlab/apputils';
import { sanitizerOptions } from '../../utils/sanitizer_options';
import { INotebookHeading } from '../../utils/headings';

/**
 * Interface describing code component properties.
 *
 * @private
 */
interface IProperties {
  /**
   * HTML sanitizer.
   */
  sanitizer: ISanitizer;

  /**
   * Notebook heading.
   */
  heading: INotebookHeading;
}

/**
 * Interface describing code component state.
 */
interface IState {
  /**
   * Notebook heading.
   */
  heading: INotebookHeading;
}

/**
 * Class for rendering a code component.
 *
 * @private
 */
class CodeComponent extends React.Component<IProperties, IState> {
  /**
   * Returns a code component.
   *
   * @param props - component properties
   * @returns code component
   */
  constructor(props: IProperties) {
    super(props);
    this.state = { heading: props.heading };
  }

  /**
   * Updates code component state.
   *
   * @param props - component properties
   */
  UNSAFE_componentWillReceiveProps(nextProps: IProperties) {
    this.setState({ heading: nextProps.heading });
  }

  /**
   * Renders a code component.
   *
   * @returns rendered component
   */
  render() {
    // Get the current rendered CodeMirror:
    let html = this.state.heading.cellRef!.editor.host.innerHTML;

    // Sanitize the HTML:
    html = this.props.sanitizer.sanitize(html, sanitizerOptions);

    return (
      <div className="cm-toc" dangerouslySetInnerHTML={{ __html: html }} />
    );
  }
}

/**
 * Exports.
 */
export { CodeComponent };
