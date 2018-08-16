import { INotebookTracker } from '@jupyterlab/notebook';

import { NotebookGeneratorOptionsManager } from './optionsmanager';

import * as React from 'react';

import { TagsToolComponent } from './tagstool';

interface NotebookGeneratorToolbarProps {}

interface NotebookGeneratorToolbarState {
  showCode: boolean;
  showMarkdown: boolean;
  showTags: boolean;
  numbering: boolean;
}

export function notebookGeneratorToolbar(
  options: NotebookGeneratorOptionsManager,
  tracker: INotebookTracker
) {
  return class extends React.Component<
    NotebookGeneratorToolbarProps,
    NotebookGeneratorToolbarState
  > {
    constructor(props: NotebookGeneratorToolbarProps) {
      super(props);
      this.state = {
        showCode: true,
        showMarkdown: false,
        showTags: false,
        numbering: true
      };
      if (tracker.currentWidget) {
        tracker.currentWidget.context.ready.then(() => {
          if (tracker.currentWidget) {
            tracker.currentWidget.content.activeCellChanged.connect(() => {
              options.updateWidget();
            });
            let _numbering = tracker.currentWidget.model.metadata.get(
              'toc-autonumbering'
            ) as boolean;
            let numbering =
              _numbering != undefined ? _numbering : options.numbering;
            let _showCode = tracker.currentWidget.model.metadata.get(
              'toc-showcode'
            ) as boolean;
            let showCode =
              _showCode != undefined ? _showCode : options.showCode;
            let _showMarkdown = tracker.currentWidget.model.metadata.get(
              'toc-showmarkdowntxt'
            ) as boolean;
            let showMarkdown =
              _showMarkdown != undefined ? _showMarkdown : options.showMarkdown;
            let _showTags = tracker.currentWidget.model.metadata.get(
              'toc-showtags'
            ) as boolean;
            let showTags =
              _showTags != undefined ? _showTags : options.showTags;
            this.allTags = [];
            options.initializeOptions(
              numbering,
              showCode,
              showMarkdown,
              showTags
            );
            this.setState({
              showCode: options.showCode,
              showMarkdown: options.showMarkdown,
              showTags: options.showTags
            });
          }
        });
      }
    }

    toggleCode = (component: React.Component) => {
      options.showCode = !options.showCode;
      this.setState({ showCode: options.showCode });
    };

    toggleMarkdown = (component: React.Component) => {
      options.showMarkdown = !options.showMarkdown;
      this.setState({ showMarkdown: options.showMarkdown });
    };

    toggleAutoNumbering = () => {
      options.numbering = !options.numbering;
      this.setState({ numbering: options.numbering });
    };

    toggleTagDropdown = () => {
      options.showTags = !options.showTags;
      this.setState({ showTags: options.showTags });
    };

    addTagIntoAllTagsList(name: string) {
      if (name === '') {
        return;
      } else if (this.allTags == null) {
        this.allTags = [name];
      } else {
        if (this.allTags.indexOf(name) < 0) {
          this.allTags.push(name);
        }
      }
    }

    getTags = () => {
      let notebook = tracker.currentWidget;
      if (notebook) {
        let cells = notebook.model.cells;
        this.allTags = [];
        for (var i = 0; i < cells.length; i++) {
          if (cells.get(i)) {
            let cellMetadata = cells.get(i)!.metadata;
            let cellTagsData = cellMetadata.get('tags') as string[];
            if (cellTagsData) {
              for (var j = 0; j < cellTagsData.length; j++) {
                let name = cellTagsData[j];
                this.addTagIntoAllTagsList(name);
              }
            }
          }
        }
      }
    };

    render() {
      let codeIcon = this.state.showCode ? (
        <div
          className="toc-toolbar-code-button toc-toolbar-button"
          onClick={event => this.toggleCode.bind(this)()}
        >
          <img
            alt="Toggle Code Cells"
            title="Toggle Code Cells"
            src={require('../../../static/code_selected.svg')}
            className="toc-toolbar-code-icon toc-toolbar-icon"
          />
        </div>
      ) : (
        <div
          className="toc-toolbar-code-button toc-toolbar-button"
          onClick={event => this.toggleCode.bind(this)()}
        >
          <img
            alt="Toggle Code Cells"
            title="Toggle Code Cells"
            src={require('../../../static/code_unselected.svg')}
            className="toc-toolbar-code-icon toc-toolbar-icon"
          />
        </div>
      );

      let markdownIcon = this.state.showMarkdown ? (
        <div
          className="toc-toolbar-markdown-button toc-toolbar-button"
          onClick={event => this.toggleMarkdown.bind(this)()}
        >
          <img
            alt="Toggle Code Cells"
            title="Toggle Code Cells"
            src={require('../../../static/markdown_selected.svg')}
            className="toc-toolbar-markdown-icon toc-toolbar-icon"
          />
        </div>
      ) : (
        <div
          className="toc-toolbar-markdown-button toc-toolbar-button"
          onClick={event => this.toggleMarkdown.bind(this)()}
        >
          <img
            alt="Toggle Code Cells"
            title="Toggle Code Cells"
            src={require('../../../static/markdown_unselected.svg')}
            className="toc-toolbar-markdown-icon toc-toolbar-icon"
          />
        </div>
      );

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

      let tagDropdown = <div />;
      let tagIcon = (
        <img
          alt="Show Tag Dropdown"
          title="Show Tag Dropdown"
          src={require('../../../static/tag_unselected.svg')}
        />
      );
      if (this.state.showTags) {
        this.getTags();
        tagDropdown = (
          <div className={'tag-dropdown'}>
            {' '}
            <TagsToolComponent
              allTagsList={this.allTags}
              tracker={tracker}
              generatorOptionsRef={options}
            />{' '}
          </div>
        );
        tagIcon = (
          <img
            alt="Hide Tag Dropdown"
            title="Hide Tag Dropdown"
            src={require('../../../static/tag_selected.svg')}
          />
        );
      }

      return (
        <div>
          <div className={'toc-toolbar'}>
            {codeIcon}
            {markdownIcon}
            {numberingIcon}
          </div>
          <div
            className={'tag-dropdown-button'}
            onClick={event => this.toggleTagDropdown()}
          >
            {tagIcon}
          </div>
          <hr className={'toolbar-hr'} />
          {tagDropdown}
        </div>
      );
    }

    allTags: string[];
  };
}
