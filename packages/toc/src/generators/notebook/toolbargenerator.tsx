// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { INotebookTracker } from '@jupyterlab/notebook';
import { JSONValue } from '@phosphor/coreutils';
import { NotebookGeneratorOptionsManager } from './optionsmanager';
import { TagsToolComponent } from './tagstool';

interface INotebookGeneratorToolbarProps {}

interface INotebookGeneratorToolbarState {
  showCode: boolean;
  showMarkdown: boolean;
  showTags: boolean;
  numbering: boolean;
}

export function notebookGeneratorToolbar(
  options: NotebookGeneratorOptionsManager,
  tracker: INotebookTracker
) {
  // Render the toolbar
  return class extends React.Component<
    INotebookGeneratorToolbarProps,
    INotebookGeneratorToolbarState
  > {
    constructor(props: INotebookGeneratorToolbarProps) {
      super(props);
      this.tagTool = null;
      this.state = {
        showCode: true,
        showMarkdown: false,
        showTags: false,
        numbering: false
      };
      if (tracker.currentWidget) {
        // Read saved user settings in notebook metadata
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
              showTags: options.showTags,
              numbering: options.numbering
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
      if (options.showTags && this.tagTool) {
        options.storeTags = this.tagTool.state.selected;
      }
      options.showTags = !options.showTags;
      this.setState({ showTags: options.showTags });
    };

    // Load all tags in the document
    getTags = () => {
      let notebook = tracker.currentWidget;
      if (notebook) {
        const cells = notebook.model.cells;
        const tagSet = new Set<string>();
        this.allTags = [];
        for (let i = 0; i < cells.length; i++) {
          const cell = cells.get(i)!;
          const tagData = cell.metadata.get('tags') as JSONValue;
          if (Array.isArray(tagData)) {
            tagData.forEach((tag: string) => tag && tagSet.add(tag));
          }
        }
        this.allTags = Array.from(tagSet);
      }
    };

    render() {
      let codeIcon = this.state.showCode ? (
        <div
          className="toc-toolbar-code-button toc-toolbar-button"
          onClick={event => this.toggleCode.bind(this)()}
        >
          <div
            role="text"
            aria-label="Toggle Code Cells"
            title="Toggle Code Cells"
            className="toc-toolbar-code-icon toc-toolbar-icon-selected"
          />
        </div>
      ) : (
        <div
          className="toc-toolbar-code-button toc-toolbar-button"
          onClick={event => this.toggleCode.bind(this)()}
        >
          <div
            role="text"
            aria-label="Toggle Code Cells"
            title="Toggle Code Cells"
            className="toc-toolbar-code-icon toc-toolbar-icon"
          />
        </div>
      );

      let markdownIcon = this.state.showMarkdown ? (
        <div
          className="toc-toolbar-markdown-button toc-toolbar-button"
          onClick={event => this.toggleMarkdown.bind(this)()}
        >
          <div
            role="text"
            aria-label="Toggle Markdown Text Cells"
            title="Toggle Markdown Text Cells"
            className="toc-toolbar-markdown-icon toc-toolbar-icon-selected"
          />
        </div>
      ) : (
        <div
          className="toc-toolbar-markdown-button toc-toolbar-button"
          onClick={event => this.toggleMarkdown.bind(this)()}
        >
          <div
            role="text"
            aria-label="Toggle Markdown Text Cells"
            title="Toggle Markdown Text Cells"
            className="toc-toolbar-markdown-icon toc-toolbar-icon"
          />
        </div>
      );

      let numberingIcon = this.state.numbering ? (
        <div
          className="toc-toolbar-auto-numbering-button toc-toolbar-button"
          onClick={event => this.toggleAutoNumbering()}
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
          onClick={event => this.toggleAutoNumbering()}
        >
          <div
            role="text"
            aria-label="Toggle Auto-Numbering"
            title="Toggle Auto-Numbering"
            className="toc-toolbar-auto-numbering-icon toc-toolbar-icon"
          />
        </div>
      );

      let tagDropdown = <div />;
      let tagIcon = (
        <div className="toc-toolbar-button">
          <div
            role="text"
            aria-label="Show Tags Menu"
            title="Show Tags Menu"
            className="toc-toolbar-tag-icon toc-toolbar-icon"
          />
        </div>
      );
      if (this.state.showTags) {
        this.getTags();
        let tagTool = (
          <TagsToolComponent
            tags={this.allTags}
            tracker={tracker}
            options={options}
            inputFilter={options.storeTags}
            ref={tagTool => (this.tagTool = tagTool)}
          />
        );
        options.setTagTool(this.tagTool);
        tagDropdown = <div className={'toc-tag-dropdown'}> {tagTool} </div>;
        tagIcon = (
          <div
            role="text"
            aria-label="Hide Tags Menu"
            title="Hide Tags Menu"
            className="toc-toolbar-tag-icon toc-toolbar-icon-selected"
          />
        );
      }

      return (
        <div>
          <div className={'toc-toolbar'}>
            {codeIcon}
            {markdownIcon}
            {numberingIcon}
            <div
              className={'toc-tag-dropdown-button'}
              onClick={event => this.toggleTagDropdown()}
            >
              {tagIcon}
            </div>
          </div>
          {tagDropdown}
        </div>
      );
    }

    allTags: string[];
    tagTool: TagsToolComponent | null;
  };
}
