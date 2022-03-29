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
   * List of headings to render.
   */
  headings: TableOfContents.IHeading[];

  setActiveHeading: (heading: TableOfContents.IHeading) => void;

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
    return <ol className="jp-TableOfContents-content">{this.buildTree()}</ol>;
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
        if (current.level === level) {
          globalIndex += 1;
          const next = items[globalIndex];

          nested.push(
            <TOCItem
              key={`${current.level}-${current.text}`}
              heading={current}
              onClick={this.props.setActiveHeading}
              onCollapse={this.props.onCollapseChange}
            >
              {next?.level > level && getChildren(items, next.level)}
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
