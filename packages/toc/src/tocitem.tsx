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
    const { children, heading, onClick, onCollapse } = this.props;

    return (
      <li
        className="jp-tocItem"
        key={`${heading.level}-${heading.text}`}
        onClick={(event: React.SyntheticEvent<HTMLLIElement>) => {
          event.preventDefault();
          onClick(heading);
        }}
      >
        <span className="jp-tocItem-content">
          {children && (
            <button
              className="jp-tocItem-collapser"
              onClick={() => {
                onCollapse(heading);
              }}
            >
              {heading.collapsed ? (
                <caretRightIcon.react tag="span" width="25px" />
              ) : (
                <caretDownIcon.react tag="span" width="25px" />
              )}
            </button>
          )}
          {heading.text}
        </span>
        {children && !heading.collapsed && <ol>{children}</ol>}
      </li>
    );
  }
}
