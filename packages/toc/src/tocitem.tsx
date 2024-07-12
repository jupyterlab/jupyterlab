// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { caretDownIcon, caretRightIcon } from '@jupyterlab/ui-components';
import * as React from 'react';
import { TableOfContents } from './tokens';

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
   * Collapse event callback.
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

    return (
      <li className="jp-tocItem">
        <div
          className={`jp-tocItem-heading ${
            isActive ? 'jp-tocItem-active' : ''
          }`}
          onMouseDown={(event: React.SyntheticEvent<HTMLDivElement>) => {
            // React only on deepest item
            if (!event.defaultPrevented) {
              event.preventDefault();
              onMouseDown(heading);
            }
          }}
        >
          <button
            className="jp-tocItem-collapser"
            onClick={(event: React.MouseEvent) => {
              event.preventDefault();
              onCollapse(heading);
            }}
            style={{ visibility: children ? 'visible' : 'hidden' }}
          >
            {heading.collapsed ? (
              <caretRightIcon.react tag="span" width="20px" />
            ) : (
              <caretDownIcon.react tag="span" width="20px" />
            )}
          </button>
          <span
            className="jp-tocItem-content"
            title={heading.text}
            {...heading.dataset}
          >
            {heading.prefix}
            {heading.text}
          </span>
        </div>
        {children && !heading.collapsed && <ol>{children}</ol>}
      </li>
    );
  }
}
