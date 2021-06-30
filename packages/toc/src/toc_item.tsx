// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { IHeading } from './utils/headings';
import { Signal } from '@lumino/signaling';
import { TableOfContents } from './toc';

/**
 * Interface describing component properties.
 *
 * @private
 */
interface IProperties {
  /**
   * Heading to render.
   */
  heading: IHeading;
  /**
   * List of headings to use for rendering current position in toc
   */
  toc: IHeading[];

  /**
   * Optional signal that emits when a toc entry is clicked
   */
  entryClicked?: Signal<TableOfContents, TOCItem>;

  /**
   * Renders a heading.
   *
   * @param item - heading
   * @param toc - list of headings
   * @returns rendered heading
   */
  itemRenderer: (item: IHeading, toc: IHeading[]) => JSX.Element | null;
}

/**
 * Interface describing component state.
 *
 * @private
 */
interface IState {}

/**
 * React component for a table of contents entry.
 *
 * @private
 */
class TOCItem extends React.Component<IProperties, IState> {
  /**
   * Renders a table of contents entry.
   *
   * @returns rendered entry
   */
  render() {
    const { heading, toc } = this.props;

    // Create an onClick handler for the TOC item
    // that scrolls the anchor into view.
    const onClick = (event: React.SyntheticEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      this.props.entryClicked?.emit(this);
      heading.onClick();
    };

    let content = this.props.itemRenderer(heading, toc);
    if (!content) {
      return null;
    }
    return (
      <li
        className="jp-tocItem"
        onClick={onClick}
        onContextMenu={(event: React.SyntheticEvent<HTMLSpanElement>) => {
          this.props.entryClicked?.emit(this);
          heading.onClick();
        }}
      >
        {content}
      </li>
    );
  }
}

/**
 * Exports.
 */
export { TOCItem };
