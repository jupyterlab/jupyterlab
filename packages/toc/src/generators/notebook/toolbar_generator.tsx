// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { INotebookTracker } from '@jupyterlab/notebook';
import { TranslationBundle } from '@jupyterlab/translation';
import {
  codeIcon,
  markdownIcon,
  numberingIcon,
  tagIcon
} from '@jupyterlab/ui-components';

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
      this._trans = options.translator.load('jupyterlab');
      this.tagTool = null;
      this.state = {
        showCode: true,
        showMarkdown: false,
        showTags: false,
        numbering: false
      };
      if (tracker.currentWidget) {
        // Read saved user settings in notebook meta data:
        void tracker.currentWidget.context.ready.then(() => {
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
      const codeToggleIcon = (
        <div
          onClick={event => this.toggleCode()}
          role="text"
          aria-label={this._trans.__('Toggle Code Cells')}
          title={this._trans.__('Toggle Code Cells')}
          className={
            this.state.showCode
              ? 'toc-toolbar-code-icon toc-toolbar-icon-selected'
              : 'toc-toolbar-code-icon toc-toolbar-icon'
          }
        >
          <codeIcon.react />
        </div>
      );

      const markdownToggleIcon = (
        <div
          onClick={event => this.toggleMarkdown()}
          role="text"
          aria-label={this._trans.__('Toggle Markdown Text Cells')}
          title={this._trans.__('Toggle Markdown Text Cells')}
          className={
            this.state.showMarkdown
              ? 'toc-toolbar-icon-selected'
              : 'toc-toolbar-icon'
          }
        >
          <markdownIcon.react />
        </div>
      );

      const numberingToggleIcon = (
        <div
          onClick={event => this.toggleNumbering()}
          role="text"
          aria-label={this._trans.__('Toggle Auto-Numbering')}
          title={this._trans.__('Toggle Auto-Numbering')}
          className={
            this.state.numbering
              ? 'toc-toolbar-icon-selected'
              : 'toc-toolbar-icon'
          }
        >
          <numberingIcon.react />
        </div>
      );

      let tagDropdown = <div />;
      let tagToggleIcon = (
        <div
          role="text"
          aria-label={this._trans.__('Show Tags Menu')}
          title={this._trans.__('Show Tags Menu')}
          className={
            this.state.showTags
              ? 'toc-toolbar-icon-selected'
              : 'toc-toolbar-icon'
          }
        >
          <tagIcon.react />
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
            translator={options.translator}
            ref={tagTool => (this.tagTool = tagTool)}
          />
        );
        options.tagTool = this.tagTool;
        tagDropdown = <div className={'toc-tag-dropdown'}> {tagTool} </div>;
      }

      return (
        <div>
          <div className={'toc-toolbar'}>
            {codeToggleIcon}
            {markdownToggleIcon}
            {numberingToggleIcon}
            <div
              className={'toc-tag-dropdown-button'}
              onClick={event => this.toggleTagDropdown()}
            >
              {tagToggleIcon}
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

    /**
     * Translation bundle.
     */
    _trans: TranslationBundle;
  };
}

/**
 * Exports.
 */
export { toolbar };
