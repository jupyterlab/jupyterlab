// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { OptionsManager } from './options_manager';

import * as React from 'react';

interface INotebookGeneratorToolbarProps {}

interface INotebookGeneratorToolbarState {
  numbering: boolean;
}

export function markdownDocGeneratorToolbar(options: OptionsManager) {
  // Render the toolbar
  return class extends React.Component<
    INotebookGeneratorToolbarProps,
    INotebookGeneratorToolbarState
  > {
    constructor(props: INotebookGeneratorToolbarProps) {
      super(props);
      this.state = { numbering: false };
      options.initializeOptions(false);
    }

    render() {
      const toggleAutoNumbering = () => {
        options.numbering = !options.numbering;
        this.setState({ numbering: options.numbering });
      };
      let numberingIcon = this.state.numbering ? (
        <div
          className="toc-toolbar-auto-numbering-button toc-toolbar-button"
          onClick={event => toggleAutoNumbering()}
        >
          <div
            role="text"
            aria-label="Toggle Auto-Numbering"
            title="Toggle Auto-Numbering"
            className="toc-toolbar-auto-numbering-icon toc-toolbar-icon-selected"
          />
        </div>
      ) : (
        <div
          className="toc-toolbar-auto-numbering-button toc-toolbar-button"
          onClick={event => toggleAutoNumbering()}
        >
          <div
            role="text"
            aria-label="Toggle Auto-Numbering"
            title="Toggle Auto-Numbering"
            className="toc-toolbar-auto-numbering-icon toc-toolbar-icon"
          />
        </div>
      );

      return (
        <div>
          <div className={'toc-toolbar'}>{numberingIcon}</div>
        </div>
      );
    }
  };
}
