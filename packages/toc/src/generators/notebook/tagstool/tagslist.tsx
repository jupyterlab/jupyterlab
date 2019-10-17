// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TagComponent } from './tag';

import * as React from 'react';

/*
 * The TagList takes a list of selected tags, a handler to change selection state,
 * and a list of all tags (strings).
 */
export interface ITagListComponentProps {
  selectedTags: string[];
  selectionStateHandler: (newState: string, add: boolean) => void;
  allTagsList: string[] | null;
}

/*
 * The TagList state contains a list of selected tags
 */
export interface ITagListComponentState {
  selected: string[];
}

/*
 * Create a React component that renders all tags in a list.
 */
export class TagListComponent extends React.Component<
  ITagListComponentProps,
  ITagListComponentState
> {
  constructor(props: ITagListComponentProps) {
    super(props);
    this.state = { selected: this.props.selectedTags };
  }

  /*
   * Toggle whether a tag is selected when it is clicked
   */
  selectedTagWithName = (name: string) => {
    if (this.props.selectedTags.indexOf(name) >= 0) {
      this.props.selectionStateHandler(name, false);
    } else {
      this.props.selectionStateHandler(name, true);
    }
  };

  /*
   * Render a tag, putting it in a TagComponent
   */
  renderElementForTags = (tags: string[]) => {
    const selectedTags = this.props.selectedTags;
    const _self = this;
    return tags.map((tag, index) => {
      const tagClass =
        selectedTags.indexOf(tag) >= 0
          ? 'toc-selected-tag toc-tag'
          : 'toc-unselected-tag toc-tag';
      return (
        <div
          key={tag}
          className={tagClass}
          onClick={event => {
            _self.selectedTagWithName(tag);
          }}
          tabIndex={-1}
        >
          <TagComponent
            selectionStateHandler={this.props.selectionStateHandler}
            selectedTags={this.props.selectedTags}
            tag={tag}
          />
        </div>
      );
    });
  };

  /*
   * Render the list of tags in the TOC tags dropdown.
   */
  render() {
    let allTagsList = this.props.allTagsList;
    let renderedTagsForAllCells = null;
    if (allTagsList) {
      renderedTagsForAllCells = this.renderElementForTags(allTagsList);
    }
    return <div className="toc-tag-holder">{renderedTagsForAllCells}</div>;
  }
}
