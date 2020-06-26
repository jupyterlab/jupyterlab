// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { TagComponent } from './tag';

/**
 * Interface describing component properties.
 *
 * @private
 */
interface IProperties {
  /**
   * Selection state handler.
   *
   * @param newState - new state
   * @param add - boolean flag
   */
  selectionStateHandler: (newState: string, add: boolean) => void;

  /**
   * List of selected tags.
   */
  selectedTags: string[];

  /**
   * List of all tags.
   */
  tags: string[] | null;
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
 * Class for a React component that renders all tags in a list.
 *
 * @private
 */
class TagListComponent extends React.Component<IProperties, IState> {
  /**
   * Returns a React component.
   *
   * @param props - properties
   * @returns component
   */
  constructor(props: IProperties) {
    super(props);
    this.state = { selected: this.props.selectedTags };
  }

  /**
   * Toggles whether a tag is selected when clicked.
   *
   * @param name - tag name
   */
  selectedTagWithName = (name: string) => {
    if (this.props.selectedTags.indexOf(name) >= 0) {
      this.props.selectionStateHandler(name, false);
    } else {
      this.props.selectionStateHandler(name, true);
    }
  };

  /**
   * Renders a tag component for each tag within a list of tags.
   *
   * @param tags - list of tags
   */
  renderTagComponents = (tags: string[]) => {
    const selectedTags = this.props.selectedTags;
    const selectedTagWithName = this.selectedTagWithName;
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
            selectedTagWithName(tag);
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

  /**
   * Renders the list of tags in the ToC tags dropdown.
   *
   * @returns rendered list
   */
  render() {
    let tags = this.props.tags;
    let jsx = null;
    if (tags) {
      jsx = this.renderTagComponents(tags);
    }
    return <div className="toc-tag-holder">{jsx}</div>;
  }
}

/**
 * Exports.
 */
export { TagListComponent };
