// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomRenderer } from '@jupyterlab/ui-components';
import * as React from 'react';
import { TableOfContentsTree } from './toctree.js';
import { TableOfContents } from './tokens.js';

/**
 * Table of contents widget.
 */
export class TableOfContentsWidget extends VDomRenderer<TableOfContents.IModel<TableOfContents.IHeading> | null> {
  /**
   * Constructor
   *
   * @param options Widget options
   */
  constructor(options: TableOfContents.IOptions = {}) {
    super(options.model);
  }

  /**
   * Render the content of this widget using the virtual DOM.
   *
   * This method will be called anytime the widget needs to be rendered, which
   * includes layout triggered rendering.
   */
  render(): JSX.Element | null {
    if (!this.model) {
      return null;
    }

    return (
      <TableOfContentsTree
        activeHeading={this.model.activeHeading}
        documentType={this.model.documentType}
        headings={this.model.headings}
        onCollapseChange={(heading: TableOfContents.IHeading) => {
          this.model!.toggleCollapse({ heading });
        }}
        setActiveHeading={(heading: TableOfContents.IHeading) => {
          this.model!.activeHeading = heading;
        }}
      ></TableOfContentsTree>
    );
  }
}
