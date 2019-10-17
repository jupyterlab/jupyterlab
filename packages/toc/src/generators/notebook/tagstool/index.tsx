// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { INotebookTracker } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
import { TagListComponent } from './tagslist';
import * as React from 'react';
import { NotebookGeneratorOptionsManager } from '../optionsmanager';

export interface ITagsToolComponentProps {
  allTagsList: string[];
  tracker: INotebookTracker;
  generatorOptionsRef: NotebookGeneratorOptionsManager;
  inputFilter: string[];
}

export interface ITagsToolComponentState {
  selected: string[];
}

/*
 * Create a React component that handles state for the tag dropdown
 */
export class TagsToolComponent extends React.Component<
  ITagsToolComponentProps,
  ITagsToolComponentState
> {
  constructor(props: ITagsToolComponentProps) {
    super(props);
    this.state = {
      selected: this.props.inputFilter
    };
  }

  /*
   * Manage the selection state of the dropdown, taking in the name of a tag and
   * whether to add or remove it.
   */
  changeSelectionState = (newState: string, add: boolean) => {
    if (add) {
      let selectedTags = this.state.selected;
      selectedTags.push(newState);
      this.setState({ selected: selectedTags });
      this.filterTags(selectedTags);
    } else {
      let selectedTags = this.state.selected;
      let newSelectedTags: string[] = [];
      for (let i = 0; i < selectedTags.length; i++) {
        if (selectedTags[i] !== newState) {
          newSelectedTags.push(selectedTags[i]);
        }
      }
      if (newSelectedTags.length === 0) {
        newSelectedTags = [];
      }
      this.setState({ selected: newSelectedTags });
      this.filterTags(newSelectedTags);
    }
  };

  public getFiltered() {
    return this.state.selected;
  }

  /*
   * Deselect all tags in the dropdown and clear filters in the TOC.
   */
  deselectAllTags = () => {
    this.setState({ selected: [] });
    this.props.generatorOptionsRef.updateWidget();
  };

  /**
   * Check whether a cell is tagged with a certain string
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

  /*
   * Tells the generator to filter the TOC by the selected tags.
   */
  filterTags = (selected: string[]) => {
    this.setState({ selected });
    this.props.generatorOptionsRef.updateWidget();
  };

  updateFilters = () => {
    let temp: string[] = [];
    let idx = 0;
    let needsUpdate = false;
    for (let i = 0; i < this.state.selected.length; i++) {
      if (
        this.props.allTagsList.indexOf(this.state.selected[i] as string) > -1
      ) {
        temp[idx] = this.state.selected[i];
        idx++;
      } else if (this.props.generatorOptionsRef.showTags === true) {
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      this.filterTags(temp);
      this.setState({ selected: temp });
    }
  };

  componentWillUpdate() {
    this.updateFilters();
  }

  /*
   * Render the interior of the tag dropdown.
   */
  render() {
    let renderedJSX = <div className="toc-no-tags-div">No Tags Available</div>;
    let filterText;
    if (this.state.selected.length === 0) {
      filterText = (
        <span className={'toc-filter-button-na'}> Clear Filters </span>
      );
    } else if (this.state.selected.length === 1) {
      filterText = (
        <span
          className={'toc-filter-button'}
          onClick={() => this.deselectAllTags()}
        >
          {' '}
          Clear 1 Filter{' '}
        </span>
      );
    } else {
      filterText = (
        <span
          className={'toc-filter-button'}
          onClick={() => this.deselectAllTags()}
        >
          {' '}
          Clear {this.state.selected.length} Filters{' '}
        </span>
      );
    }
    if (this.props.allTagsList && this.props.allTagsList.length > 0) {
      renderedJSX = (
        <div className={'toc-tags-container'}>
          <TagListComponent
            allTagsList={this.props.allTagsList}
            selectionStateHandler={this.changeSelectionState}
            selectedTags={this.state.selected}
          />
          {filterText}
        </div>
      );
    }
    return renderedJSX;
  }
}
