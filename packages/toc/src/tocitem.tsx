// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { caretDownIcon, caretRightIcon } from '@jupyterlab/ui-components';
import * as React from 'react';
import { TableOfContents } from './tokens';

/**
 * Interface describing component properties.
 *
 * @private
 */
export interface ITOCItemProps {
  isActive: boolean;
  /**
   * Heading to render.
   */
  heading: TableOfContents.IHeading;

  onClick: (heading: TableOfContents.IHeading) => void;

  onCollapse: (heading: TableOfContents.IHeading) => void;
}

/**
 * React component for a table of contents entry.
 */
export class TOCItem extends React.PureComponent<
  React.PropsWithChildren<ITOCItemProps>
> {
  /**
   * Renders a table of contents entry.
   *
   * @returns rendered entry
   */
  render(): JSX.Element | null {
    const { children, isActive, heading, onClick, onCollapse } = this.props;

    return (
      <li className="jp-tocItem" key={`${heading.level}-${heading.text}`}>
        <div
          className={`jp-tocItem-heading ${
            isActive ? 'jp-tocItem-active' : ''
          }`}
          onClick={(event: React.SyntheticEvent<HTMLDivElement>) => {
            // React only on deepest item
            if (!event.defaultPrevented) {
              event.preventDefault();
              onClick(heading);
            }
          }}
        >
          {children && (
            <button
              className="jp-tocItem-collapser"
              onClick={(event: React.MouseEvent) => {
                event.preventDefault();
                onCollapse(heading);
              }}
            >
              {heading.collapsed ? (
                <caretRightIcon.react tag="span" width="20px" />
              ) : (
                <caretDownIcon.react tag="span" width="20px" />
              )}
            </button>
          )}
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
