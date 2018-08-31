import { INotebookTracker } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
import { TagListComponent } from './tagslist';
import * as React from 'react';
import { NotebookGeneratorOptionsManager } from '../optionsmanager';

export interface TagsToolComponentProps {
  allTagsList: string[];
  tracker: INotebookTracker;
  generatorOptionsRef: NotebookGeneratorOptionsManager;
}

export interface TagsToolComponentState {
  selected: string[];
}

/*
* Create a React component that handles state for the tag dropdown
*/
export class TagsToolComponent extends React.Component<
  TagsToolComponentProps,
  TagsToolComponentState
> {
  constructor(props: TagsToolComponentProps) {
    super(props);
    this.state = {
      selected: []
    };
    this.tracker = this.props.tracker;
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
    }
  };

  /*
  * Deselect all tags in the dropdown and clear filters in the TOC.
  */
  deselectAllTags = () => {
    this.props.generatorOptionsRef.filtered = [];
    this.setState({ selected: [] });
  };

  /* 
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
  * Selects cells in the document that are tagged with any of the selected tags
  * in the TOC tags dropdown
  */
  selectCells = () => {
    let notebookPanel = this.tracker.currentWidget;
    if (notebookPanel) {
      let notebook = notebookPanel.content;
      let first: boolean = true;
      for (let i = 0; i < notebookPanel.model.cells.length; i++) {
        let currentCell = notebook.widgets[i] as Cell;
        for (let j = 0; j < this.state.selected.length; j++) {
          if (this.containsTag(this.state.selected[j], currentCell)) {
            if (first === true) {
              notebook.deselectAll();
              notebook.activeCellIndex = i;
              first = false;
            } else {
              notebook.select(notebook.widgets[i] as Cell);
            }
          }
        }
      }
    }
  };

  /*
  * Tells the generator to filter the TOC by the selected tags.
  */
  filterTags = () => {
    this.props.generatorOptionsRef.filtered = this.state.selected;
  };

  /*
  * Render the interior of the tag dropdown.
  */
  render() {
    let renderedJSX = <div className="toc-no-tags-div">No Tags Available</div>;
    if (this.props.allTagsList && this.props.allTagsList.length > 0) {
      renderedJSX = (
        <div className={'toc-tags-container'}>
          <TagListComponent
            allTagsList={this.props.allTagsList}
            selectionStateHandler={this.changeSelectionState}
            selectedTags={this.state.selected}
          />
          <span
            className={'toc-clear-button'}
            onClick={() => this.deselectAllTags()}
          >
            {' '}
            Clear All{' '}
          </span>
          <span
            onClick={() => this.filterTags()}
            className={'toc-filter-button'}
          >
            {' '}
            Filter
          </span>
          <span
            className={'toc-select-button'}
            onClick={() => this.selectCells()}
          >
            {' '}
            Select Cells{' '}
          </span>
        </div>
      );
    }
    return renderedJSX;
  }

  private tracker: INotebookTracker;
}
