// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { INotebookTracker } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
import { nullTranslator, ITranslator } from '@jupyterlab/translation';
import { OptionsManager } from '../options_manager';
import { TagListComponent } from './tag_list';
import { TranslationBundle } from '@jupyterlab/translation';

/**
 * Interface describing component properties.
 *
 * @private
 */
interface IProperties {
  /**
   * List of tags.
   */
  tags: string[];

  /**
   * Notebook tracker.
   */
  tracker: INotebookTracker;

  /**
   * Notebook Generator options.
   */
  options: OptionsManager;

  /**
   * Input filter.
   */
  inputFilter: string[];

  /**
   * Language translator.
   */
  translator?: ITranslator;
}

/**
 * Interface describing component state.
 *
 * @private
 */
interface IState {
  /**
   * List of selected tags.
   */
  selected: string[];
}

/**
 * Tag dropdown React component.
 *
 * @private
 */
class TagsToolComponent extends React.Component<IProperties, IState> {
  /**
   * Returns a component.
   *
   * @param props - component properties
   * @returns component
   */
  constructor(props: IProperties) {
    super(props);
    this.state = {
      selected: this.props.inputFilter
    };
    const translator = this.props.translator || nullTranslator;
    this._trans = translator.load('jupyterlab');
  }

  /**
   * Changes the dropdown selection state.
   *
   * @param newState - new state
   * @param add - boolean indicating whether to add to selection
   */
  changeSelectionState = (newState: string, add: boolean) => {
    let tags = this.state.selected;
    if (add) {
      tags.push(newState);
      this.setState({ selected: tags });
      this.filterTags(tags);
    } else {
      let selected: string[] = [];
      for (let i = 0; i < tags.length; i++) {
        if (tags[i] !== newState) {
          selected.push(tags[i]);
        }
      }
      this.setState({ selected: selected });
      this.filterTags(selected);
    }
  };

  /**
   * Returns a list of selected tags.
   *
   * @returns tag list
   */
  get filtered() {
    return this.state.selected;
  }

  /**
   * De-selects all tags in the dropdown and clear filters in the ToC.
   */
  deselectAll = () => {
    this.setState({ selected: [] });
    this.props.options.updateWidget();
  };

  /**
   * Checks whether a cell has a provided tag.
   *
   * @param tag - tag
   * @param cell - cell reference
   * @returns boolean indicating whether a cell has a provided tag
   */
  containsTag(tag: string, cell: Cell) {
    if (cell === null) {
      return false;
    }
    let tagList = cell.model.metadata.get('tags') as string[];
    if (tagList) {
      for (let i = 0; i < tagList.length; i++) {
        if (tagList[i] === tag) {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * Filters the ToC by according to selected tags.
   *
   * @param selected - selected tags
   */
  filterTags = (selected: string[]) => {
    this.setState({ selected });
    this.props.options.updateWidget();
  };

  /**
   * Updates filters.
   */
  updateFilters = () => {
    let tmp: string[] = [];
    let idx = 0;
    let update = false;
    for (let i = 0; i < this.state.selected.length; i++) {
      if (this.props.tags.indexOf(this.state.selected[i] as string) > -1) {
        tmp[idx] = this.state.selected[i];
        idx += 1;
      } else if (this.props.options.showTags === true) {
        update = true;
      }
    }
    if (update) {
      this.filterTags(tmp);
      this.setState({ selected: tmp });
    }
  };

  /**
   * Updates filters.
   */
  UNSAFE_componentWillUpdate() {
    this.updateFilters();
  }

  /**
   * Renders the interior of the tag dropdown.
   *
   * @returns rendered component
   */
  render() {
    let jsx = (
      <div className="toc-no-tags-div">
        {this._trans.__('No Tags Available')}
      </div>
    );
    let text;
    if (this.state.selected.length === 0) {
      text = (
        <span className={'toc-filter-button-na'}>
          {this._trans.__('Clear Filters')}
        </span>
      );
    } else if (this.state.selected.length === 1) {
      text = (
        <span
          className={'toc-filter-button'}
          onClick={() => this.deselectAll()}
        >
          {' '}
          Clear 1 Filter{' '}
        </span>
      );
    } else {
      text = (
        <span
          className={'toc-filter-button'}
          onClick={() => this.deselectAll()}
        >
          {' '}
          Clear {this.state.selected.length} Filters{' '}
        </span>
      );
    }
    if (this.props.tags && this.props.tags.length > 0) {
      jsx = (
        <div className={'toc-tags-container'}>
          <TagListComponent
            tags={this.props.tags}
            selectionStateHandler={this.changeSelectionState}
            selectedTags={this.state.selected}
          />
          {text}
        </div>
      );
    }
    return jsx;
  }

  _trans: TranslationBundle;
}

/**
 * Exports.
 */
export { TagsToolComponent };
