import { TagListComponent } from './tagslist';
import * as React from 'react';
//import StyleClasses from './styles';
// const TAG_TOOL_CLASS = 'jp-cellTags-Tools';
//const TagsToolStyleClasses = StyleClasses.TagsToolStyleClasses;
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
    this.setState({ selected: [] });
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
        <TagListComponent
          allTagsList={this.props.allTagsList}
          selectionStateHandler={this.changeSelectionState}
          selectedTags={this.state.selected}
        />
        <button onClick={() => this.deselectAllTags()}> Clear All </button>
      </div>
    );
  }

  private node: any;
}
