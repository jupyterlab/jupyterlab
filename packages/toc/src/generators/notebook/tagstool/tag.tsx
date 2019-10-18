// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

/**
 * Interface describing component properties.
 *
 * @private
 */
interface IProperties {
  /**
   * Selection state callback.
   *
   * @param newState - new state
   * @param add - boolean flag
   */
  selectionStateHandler: (newState: string, add: boolean) => void;

  /**
   * Selected tags.
   */
  selectedTags: string[];

  /**
   * Tag.
   */
  tag: string;
}

/**
 * Abstract class defining a React component containing one tag label.
 *
 * @private
 */
abstract class TagComponent extends React.Component<IProperties> {
  /**
   * Returns a React component.
   *
   * @param props - properties
   * @returns component
   */
  constructor(props: IProperties) {
    super(props);
  }

  /**
   * Renders a component.
   *
   * @returns rendered component
   */
  render() {
    const tag = this.props.tag as string;
    return (
      <div>
        <label className="toc-tag-label" key={new Date().toLocaleTimeString()}>
          {tag}
        </label>
      </div>
    );
  }
}

/**
 * Exports.
 */
export { TagComponent };
