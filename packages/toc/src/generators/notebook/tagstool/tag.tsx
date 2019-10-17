// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

export interface ITagComponentProps {
  selectionStateHandler: (newState: string, add: boolean) => void;
  selectedTags: string[];
  tag: string;
}

/*
 * Create a React component containing one tag label
 */
export abstract class TagComponent extends React.Component<ITagComponentProps> {
  constructor(props: ITagComponentProps) {
    super(props);
  }

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
