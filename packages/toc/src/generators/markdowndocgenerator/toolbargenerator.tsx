import { MarkdownDocGeneratorOptionsManager } from './optionsmanager';

import * as React from 'react';

interface NotebookGeneratorToolbarProps {}

interface NotebookGeneratorToolbarState {
  numbering: boolean;
}

export function markdownDocGeneratorToolbar(
  options: MarkdownDocGeneratorOptionsManager
) {
  // Render the toolbar
  return class extends React.Component<
    NotebookGeneratorToolbarProps,
    NotebookGeneratorToolbarState
  > {
    constructor(props: NotebookGeneratorToolbarProps) {
      super(props);
      this.state = { numbering: true };
      options.initializeOptions(true);
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
