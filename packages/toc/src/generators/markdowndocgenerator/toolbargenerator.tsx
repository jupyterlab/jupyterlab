import { MarkdownDocGeneratorOptionsManager } from './optionsmanager';

import * as React from 'react';

interface NotebookGeneratorToolbarProps {}

interface NotebookGeneratorToolbarState {
  numbering: boolean;
}

export function markdownDocGeneratorToolbar(
  options: MarkdownDocGeneratorOptionsManager
) {
  return class extends React.Component<
    NotebookGeneratorToolbarProps,
    NotebookGeneratorToolbarState
  > {
    constructor(props: NotebookGeneratorToolbarProps) {
      super(props);
      this.state = { numbering: true };
      options.initializeOptions(true);
    }

    toggleAutoNumbering = () => {
      options.numbering = !options.numbering;
      this.setState({ numbering: options.numbering });
    };

    render() {
      let numberingIcon = this.state.numbering ? (
        <div
          className="toc-toolbar-auto-numbering-button toc-toolbar-button"
          onClick={event => this.toggleAutoNumbering()}
        >
          <img
            alt="Toggle Auto-Numbering"
            title="Toggle Auto-Numbering"
            src={require('../../../static/autonumbering_selected.svg')}
            className="toc-toolbar-auto-numbering-icon toc-toolbar-icon"
          />
        </div>
      ) : (
        <div
          className="toc-toolbar-auto-numbering-button toc-toolbar-button"
          onClick={event => this.toggleAutoNumbering()}
        >
          <img
            alt="Toggle Auto-Numbering"
            title="Toggle Auto-Numbering"
            src={require('../../../static/autonumbering_unselected.svg')}
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
