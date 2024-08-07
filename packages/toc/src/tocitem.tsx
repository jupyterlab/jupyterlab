// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { TableOfContents } from './tokens';
import { TreeItem, TreeItemElement } from '@jupyter/react-components';

/**
 * Interface describing component properties.
 */
export interface ITableOfContentsItemsProps {
  /**
   * Whether this item is active or not.
   */
  isActive: boolean;
  /**
   * Heading to render.
   */
  heading: TableOfContents.IHeading;

  /**
   * On `mouse-down` event callback.
   */
  onMouseDown: (heading: TableOfContents.IHeading) => void;

  /**
   * Collapse/Expand event callback.
   */
  onCollapse: (heading: TableOfContents.IHeading) => void;
}

/**
 * React component for a table of contents entry.
 */
export class TableOfContentsItem extends React.PureComponent<
  React.PropsWithChildren<ITableOfContentsItemsProps>
> {
  /**
   * Renders a table of contents entry.
   *
   * @returns rendered entry
   */
  render(): JSX.Element | null {
    const { children, isActive, heading, onCollapse, onMouseDown } = this.props;

    // Handling toggle of collapse and expand
    const handleToggle = (event: CustomEvent) => {
      // This will toggle the state and call the appropriate collapse or expand function
      if (
        !event.defaultPrevented &&
        (event.target as TreeItemElement).expanded !== !heading.collapsed
      ) {
        event.preventDefault();
        onCollapse(heading);
      }
    };

    return (
      <TreeItem
        className={'jp-tocItem jp-TreeItem nested'}
        selected={isActive}
        expanded={!heading.collapsed}
        onExpand={handleToggle}
        onMouseDown={(event: React.SyntheticEvent<HTMLElement>) => {
          // React only on deepest item
          if (!event.defaultPrevented) {
            event.preventDefault();
            onMouseDown(heading);
          }
        }}
        onKeyUp={event => {
          // React on key up because key down is used for tree view navigation
          // and therefore key-down on Enter is default prevented to change the
          // selection state
          if (!event.defaultPrevented && event.key === 'Enter' && !isActive) {
            event.preventDefault();
            onMouseDown(heading);
          }
        }}
      >
        <div className="jp-tocItem-heading">
          <span
            className="jp-tocItem-content"
            title={heading.text}
            {...heading.dataset}
          >
            {heading.prefix}
            {heading.text}
          </span>
        </div>
        {children}
      </TreeItem>
    );
  }
}
