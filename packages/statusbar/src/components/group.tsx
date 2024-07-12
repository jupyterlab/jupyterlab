// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

/**
 * A tsx component for a set of items logically grouped together.
 */
export function GroupItem(
  props: GroupItem.IProps & React.HTMLAttributes<HTMLDivElement>
): React.ReactElement<GroupItem.IProps> {
  const { spacing, children, className, ...rest } = props;
  const numChildren = React.Children.count(children);

  return (
    <div className={`jp-StatusBar-GroupItem ${className || ''}`} {...rest}>
      {React.Children.map(children, (child, i) => {
        if (i === 0) {
          return <div style={{ marginRight: `${spacing}px` }}>{child}</div>;
        } else if (i === numChildren - 1) {
          return <div style={{ marginLeft: `${spacing}px` }}>{child}</div>;
        } else {
          return <div style={{ margin: `0px ${spacing}px` }}>{child}</div>;
        }
      })}
    </div>
  );
}

/**
 * A namespace for GroupItem statics.
 */
export namespace GroupItem {
  /**
   * Props for the GroupItem.
   */
  export interface IProps {
    /**
     * The spacing, in px, between the items in the group.
     */
    spacing: number;

    /**
     * The items to arrange in a group.
     */
    children: JSX.Element[];
  }
}
