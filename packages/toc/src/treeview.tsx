// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { VDomRenderer } from '@jupyterlab/ui-components';
import * as React from 'react';
import { TableOfContentsTree } from './toctree';
import { TableOfContents } from './tokens';

/**
 * Table of contents widget.
 */
export class TableOfContentsWidget extends VDomRenderer<TableOfContents.IModel<TableOfContents.IHeading> | null> {
  /**
   * Constructor
   *
   * @param options Widget options
   */
  constructor(options: TableOfContents.IOptions) {
    super(options.model);
    this._placeholderHeadline = options.placeholderHeadline;
    this._placeholderText = options.placeholderText;
  }

  /**
   * Render the content of this widget using the virtual DOM.
   *
   * This method will be called anytime the widget needs to be rendered, which
   * includes layout triggered rendering.
   */
  render(): JSX.Element | null {
    if (!this.model || this.model.headings.length === 0) {
      this.parent?.addClass('jp-TableOfContents-empty');
      return (
        <div className="jp-TableOfContents-placeholder">
          <div className="jp-TableOfContents-placeholderContent">
            <h1>{this._placeholderHeadline}</h1>
            <p>{this._placeholderText}</p>
          </div>
        </div>
      );
    } else {
      this.parent?.removeClass('jp-TableOfContents-empty');
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
          this.model!.setActiveHeading(heading);
        }}
      ></TableOfContentsTree>
    );
  }

  readonly _placeholderHeadline: string;
  readonly _placeholderText: string;
}
