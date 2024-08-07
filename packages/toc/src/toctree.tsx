// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TreeView } from '@jupyter/react-components';
import * as React from 'react';
import { TableOfContentsItem } from './tocitem';
import { TableOfContents } from './tokens';

/**
 * Interface describing component properties.
 */
export interface ITableOfContentsTreeProps {
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
export class TableOfContentsTree extends React.PureComponent<ITableOfContentsTreeProps> {
  /**
   * Renders a table of contents tree.
   */
  render(): JSX.Element {
    const { documentType } = this.props;
    return (
      <TreeView
        className={'jp-TableOfContents-content jp-TreeView'}
        {...{ 'data-document-type': documentType }}
      >
        {this.buildTree()}
      </TreeView>
    );
  }

  /**
   * Convert the flat headings list to a nested tree list
   */
  protected buildTree(): JSX.Element[] {
    if (this.props.headings.length === 0) {
      return [];
    }

    const buildOneTree = (currentIndex: number): [JSX.Element, number] => {
      const items = this.props.headings;
      const children = new Array<JSX.Element>();
      const current = items[currentIndex];
      let nextCandidateIndex = currentIndex + 1;

      while (nextCandidateIndex < items.length) {
        const candidateItem = items[nextCandidateIndex];
        if (candidateItem.level <= current.level) {
          break;
        }
        const [child, nextIndex] = buildOneTree(nextCandidateIndex);
        children.push(child);
        nextCandidateIndex = nextIndex;
      }
      const currentTree = (
        <TableOfContentsItem
          key={`${current.level}-${currentIndex}-${current.text}`}
          isActive={
            !!this.props.activeHeading && current === this.props.activeHeading
          }
          heading={current}
          onMouseDown={this.props.setActiveHeading}
          onCollapse={this.props.onCollapseChange}
        >
          {children.length ? children : null}
        </TableOfContentsItem>
      );
      return [currentTree, nextCandidateIndex];
    };

    const trees = new Array<JSX.Element>();
    let currentIndex = 0;
    while (currentIndex < this.props.headings.length) {
      const [tree, nextIndex] = buildOneTree(currentIndex);
      trees.push(tree);
      currentIndex = nextIndex;
    }

    return trees;
  }
}
