// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { TOCItem } from './tocitem';
import { TableOfContents } from './tokens';

/**
 * Interface describing component properties.
 */
export interface ITOCTreeProps {
  /**
   * Currently active heading.
   */
  activeHeading: TableOfContents.IHeading | null;
  /**
   * Type of document supported by the model.
   */
  documentType: string;
  /**
   * List of headings to render.
   */
  headings: TableOfContents.IHeading[];
  /**
   * Set active heading.
   */
  setActiveHeading: (heading: TableOfContents.IHeading) => void;
  /**
   * Collapse heading callback.
   */
  onCollapseChange: (heading: TableOfContents.IHeading) => void;
}

/**
 * React component for a table of contents tree.
 */
export class TOCTree extends React.PureComponent<ITOCTreeProps> {
  /**
   * Renders a table of contents tree.
   */
  render(): JSX.Element {
    const { documentType } = this.props;
    return (
      <ol
        className="jp-TableOfContents-content"
        {...{ 'data-document-type': documentType }}
      >
        {this.buildTree()}
      </ol>
    );
  }

  /**
   * Convert the flat headings list to a nested tree list
   */
  protected buildTree(): JSX.Element[] {
    if (this.props.headings.length === 0) {
      return [];
    }

    let globalIndex = 0;

    const getChildren = (
      items: TableOfContents.IHeading[],
      level: number
    ): JSX.Element[] => {
      const nested = new Array<JSX.Element>();
      while (globalIndex < items.length) {
        const current = items[globalIndex];
        if (current.level >= level) {
          globalIndex += 1;
          const next = items[globalIndex];

          nested.push(
            <TOCItem
              key={`${current.level}-${current.text}`}
              isActive={
                !!this.props.activeHeading &&
                current === this.props.activeHeading
              }
              heading={current}
              onMouseDown={this.props.setActiveHeading}
              onCollapse={this.props.onCollapseChange}
            >
              {next && next.level > level && getChildren(items, level + 1)}
            </TOCItem>
          );
        } else {
          break;
        }
      }

      return nested;
    };

    return getChildren(this.props.headings, this.props.headings[0].level);
  }
}
