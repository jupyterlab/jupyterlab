// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { INotebookTracker } from '@jupyterlab/notebook';
import { JSONValue } from '@lumino/coreutils';
import { OptionsManager } from './options_manager';
import { TagsToolComponent } from './tagstool';

/**
 * Interface describing toolbar properties.
 *
 * @private
 */
interface IProperties {}

/**
 * Interface describing toolbar state.
 *
 * @private
 */
interface IState {
  /**
   * Boolean indicating whether to show code previews.
   */
  showCode: boolean;

  /**
   * Boolean indicating whether to show Markdown previews.
   */
  showMarkdown: boolean;

  /**
   * Boolean indicating whether to show tags.
   */
  showTags: boolean;

  /**
   * Boolean indicating whether to show numbering.
   */
  numbering: boolean;
}

/**
 * Returns a component for rendering a notebook table of contents toolbar.
 *
 * @private
 * @param options - generator options
 * @param tracker - notebook tracker
 * @returns toolbar component
 */
function toolbar(options: OptionsManager, tracker: INotebookTracker) {
  return class Toolbar extends React.Component<IProperties, IState> {
    /**
     * Returns a component for rendering a notebook table of contents toolbar.
     *
     * @param props - toolbar properties
     * @returns toolbar component
     */
    constructor(props: IProperties) {
      super(props);
      this.tagTool = null;
      this.state = {
        showCode: true,
        showMarkdown: false,
        showTags: false,
        numbering: false
      };
      if (tracker.currentWidget) {
        // Read saved user settings in notebook meta data:
        tracker.currentWidget.context.ready.then(() => {
          if (tracker.currentWidget) {
            tracker.currentWidget.content.activeCellChanged.connect(() => {
              options.updateWidget();
            });
            const numbering = tracker.currentWidget.model!.metadata.get(
              'toc-autonumbering'
            ) as boolean;
            const showCode = tracker.currentWidget.model!.metadata.get(
              'toc-showcode'
            ) as boolean;
            const showMarkdown = tracker.currentWidget.model!.metadata.get(
              'toc-showmarkdowntxt'
            ) as boolean;
            const showTags = tracker.currentWidget.model!.metadata.get(
              'toc-showtags'
            ) as boolean;
            options.initializeOptions(
              numbering || options.numbering,
              showCode || options.showCode,
              showMarkdown || options.showMarkdown,
              showTags || options.showTags
            );
            this.setState({
              showCode: options.showCode,
              showMarkdown: options.showMarkdown,
              showTags: options.showTags,
              numbering: options.numbering
            });
            this.tags = [];
          }
        });
      }
    }

    /**
     * Toggle whether to show code previews.
     */
    toggleCode() {
      options.showCode = !options.showCode;
      this.setState({ showCode: options.showCode });
    }

    /**
     * Toggle whether to show Markdown previews.
     */
    toggleMarkdown() {
      options.showMarkdown = !options.showMarkdown;
      this.setState({ showMarkdown: options.showMarkdown });
    }

    /**
     * Toggle whether to number headings.
     */
    toggleNumbering() {
      options.numbering = !options.numbering;
      this.setState({ numbering: options.numbering });
    }

    /**
     * Toggle tag dropdown.
     */
    toggleTagDropdown() {
      if (options.showTags && this.tagTool) {
        options.storeTags = this.tagTool.state.selected;
      }
      options.showTags = !options.showTags;
      this.setState({ showTags: options.showTags });
    }

    /**
     * Loads all document tags.
     */
    loadTags() {
      const notebook = tracker.currentWidget;
      if (notebook) {
        const cells = notebook.model!.cells;
        const tags = new Set<string>();
        this.tags = [];
        for (let i = 0; i < cells.length; i++) {
          const cell = cells.get(i)!;
          const list = cell.metadata.get('tags') as JSONValue;
          if (Array.isArray(list)) {
            list.forEach((tag: string) => tag && tags.add(tag));
          }
        }
        this.tags = Array.from(tags);
      }
    }

    /**
     * Renders a toolbar.
     *
     * @returns rendered toolbar
     */
    render() {
      const codeIcon = this.state.showCode ? (
        <div
          className="toc-toolbar-code-button toc-toolbar-button"
          onClick={event => this.toggleCode()}
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
          onClick={event => this.toggleCode()}
        >
          <div
            role="text"
            aria-label="Toggle Code Cells"
            title="Toggle Code Cells"
            className="toc-toolbar-code-icon toc-toolbar-icon"
          />
        </div>
      );

      const markdownIcon = this.state.showMarkdown ? (
        <div
          className="toc-toolbar-markdown-button toc-toolbar-button"
          onClick={event => this.toggleMarkdown()}
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
          onClick={event => this.toggleMarkdown()}
        >
          <div
            role="text"
            aria-label="Toggle Markdown Text Cells"
            title="Toggle Markdown Text Cells"
            className="toc-toolbar-markdown-icon toc-toolbar-icon"
          />
        </div>
      );

      const numberingIcon = this.state.numbering ? (
        <div
          className="toc-toolbar-auto-numbering-button toc-toolbar-button"
          onClick={event => this.toggleNumbering()}
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
          onClick={event => this.toggleNumbering()}
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
        this.loadTags();
        const tagTool = (
          <TagsToolComponent
            tags={this.tags}
            tracker={tracker}
            options={options}
            inputFilter={options.storeTags}
            ref={tagTool => (this.tagTool = tagTool)}
          />
        );
        options.tagTool = this.tagTool;
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

    /**
     * List of tags.
     */
    tags: string[];

    /**
     * Tag tool component.
     */
    tagTool: TagsToolComponent | null;
  };
}

/**
 * Exports.
 */
export { toolbar };
