import { INotebookTracker } from '@jupyterlab/notebook';
import { Cell, ICellModel } from '@jupyterlab/cells';
import { TagListComponent } from './tagslist';
import * as React from 'react';
import { NotebookGeneratorOptionsManager } from './generators';

export interface TagsToolComponentProps {
  // widget: TagsWidget;
  allTagsList: string[];
  tracker: INotebookTracker;
  generatorOptionsRef: NotebookGeneratorOptionsManager;
}

export interface TagsToolComponentState {
  selected: string[];
}

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
    this.node = null;
  }

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

  deselectAllTags = () => {
    this.props.generatorOptionsRef.filtered = [];
    this.setState({ selected: [] });
  };

  cellModelContainsTag(tag: string, cellModel: ICellModel) {
    let tagList = cellModel.metadata.get('tags') as string[];
    if (tagList) {
      for (let i = 0; i < tagList.length; i++) {
        if (tagList[i] === tag) {
          return true;
        }
      }
      return false;
    }
  }

  containsTag(tag: string, cell: Cell) {
    if (cell === null) {
      return false;
    }
    return this.cellModelContainsTag(tag, cell.model);
  }

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

  filterTags = () => {
    this.props.generatorOptionsRef.filtered = this.state.selected;
  };

  handleClick = (e: any) => {
    if (this.node) {
      if (this.node.contains(e.target)) {
        return;
      }
      this.node = null;
    }
  };

  render() {
    let renderedJSX = <div>No Tags Available</div>;
    if (this.props.allTagsList && this.props.allTagsList.length > 0) {
      renderedJSX = (
        <div>
          <TagListComponent
            allTagsList={this.props.allTagsList}
            selectionStateHandler={this.changeSelectionState}
            selectedTags={this.state.selected}
          />
          <span
            className={'clear-button'}
            onClick={() => this.deselectAllTags()}
          >
            {' '}
            Clear All{' '}
          </span>
          <span className={'select-button'} onClick={() => this.selectCells()}>
            {' '}
            Select Cells{' '}
          </span>
          <span onClick={() => this.filterTags()} className={'filter-button'}>
            {' '}
            Filter
          </span>
        </div>
      );
    }
    return renderedJSX;
  }

  private node: any;
  private tracker: INotebookTracker;
}
