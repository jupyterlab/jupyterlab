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

  // Filter out null or undefined children for clean rendering.
  const validChildren = React.Children.toArray(children).filter(Boolean);
  const numChildren = validChildren.length;

  return (
    <div className={`jp-StatusBar-GroupItem ${className || ''}`} {...rest}>
      {validChildren.map((child, i) => {
        const key = `group-item-${i}`;
        if (i === 0) {
          return (
            <div key={key} style={{ marginRight: `${spacing}px` }}>
              {child}
            </div>
          );
        } else if (i === numChildren - 1) {
          return (
            <div key={key} style={{ marginLeft: `${spacing}px` }}>
              {child}
            </div>
          );
        } else {
          return (
            <div key={key} style={{ margin: `0px ${spacing}px` }}>
              {child}
            </div>
          );
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
     * Using React.ReactNode to accept any valid child, including null and undefined.
     */
    children: React.ReactNode;
  }
}
