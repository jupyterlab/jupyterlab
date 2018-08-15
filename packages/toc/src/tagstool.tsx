import { TagListComponent } from './tagslist';

/* import { PanelLayout } from '@phosphor/widgets';

import { CellTools, INotebookTracker } from '@jupyterlab/notebook';

import { Message } from '@phosphor/messaging';

import { ObservableJSON } from '@jupyterlab/observables';

import { JupyterLab } from '@jupyterlab/application'; */

import * as React from 'react';
import StyleClasses from './styles';

// const TAG_TOOL_CLASS = 'jp-cellTags-Tools';
const TagsToolStyleClasses = StyleClasses.TagsToolStyleClasses;

export interface TagsToolComponentProps {
  // widget: TagsWidget;
  allTagsList: string[];
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
    this.node = null;
  }

  componentWillMount() {
    document.addEventListener('mousedown', this.handleClick, false);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClick, false);
  }

  /* clickedSelectAll = () => {
    let selectedTags: string[] = [this.state.selected];
    (this.props.widget as TagsWidget).selectAll(selectedTags);
  }; */

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

  handleClick = (e: any) => {
    if (this.node) {
      if (this.node.contains(e.target)) {
        return;
      }
      this.node = null;
    }
  };

  render() {
    return (
      <div>
        <span>
          <div className={TagsToolStyleClasses.tagHeaderStyleClass}>Tags</div>
          <hr className={TagsToolStyleClasses.tagHeaderHrStyleClass} />
        </span>
        <TagListComponent
          allTagsList={this.props.allTagsList}
          selectionStateHandler={this.changeSelectionState}
          selectedTags={this.state.selected}
        />
      </div>
    );
  }

  private node: any;
}

/* export class TagsTool extends CellTools.Tool {
  constructor(notebook_Tracker: INotebookTracker, app: JupyterLab) {
    super();
    this.notebookTracker = notebook_Tracker;
    let layout = (this.layout = new PanelLayout());
    this.addClass(TAG_TOOL_CLASS);
    layout.addWidget(this.widget);
  }

  protected onActiveCellChanged(msg: Message): void {
    this.widget.currentActiveCell = this.parent.activeCell;
    this.widget.loadTagsForActiveCell();
  }

  protected onAfterShow() {
    this.widget.getAllTagsInNotebook();
  }

  protected onAfterAttach() {
    if (this.notebookTracker && this.notebookTracker.currentWidget) {
      this.notebookTracker.currentWidget.context.ready.then(() => {
        this.widget.getAllTagsInNotebook();
      });
      this.notebookTracker.currentChanged.connect(() => {
        this.widget.getAllTagsInNotebook();
      });
      this.notebookTracker.currentWidget.model.cells.changed.connect(() => {
        this.widget.getAllTagsInNotebook();
      });
    }
  }

  protected onMetadataChanged(msg: ObservableJSON.ChangeMessage): void {
    if (!this.widget.tagsListShallNotRefresh) {
      this.widget.validateMetadataForActiveCell();
      this.widget.loadTagsForActiveCell();
      this.widget.getAllTagsInNotebook();
    }
  }

  private widget: TagsWidget = null;
  public notebookTracker: INotebookTracker | null = null;
}
*/
