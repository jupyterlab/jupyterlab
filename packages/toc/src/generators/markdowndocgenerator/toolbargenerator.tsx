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
          <img
            alt="Toggle Auto-Numbering"
            title="Toggle Auto-Numbering"
            src={require('../../../style/img/autonumbering_selected.svg')}
            className="toc-toolbar-auto-numbering-icon toc-toolbar-icon"
          />
        </div>
      ) : (
        <div
          className="toc-toolbar-auto-numbering-button toc-toolbar-button"
          onClick={event => toggleAutoNumbering()}
        >
          <img
            alt="Toggle Auto-Numbering"
            title="Toggle Auto-Numbering"
            src={require('../../../style/img/autonumbering_unselected.svg')}
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
