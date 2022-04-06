// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { VDomRenderer } from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
import * as React from 'react';
import { TOCTree } from './toctree';
import { TableOfContents } from './tokens';

/**
 * Widget for hosting a notebook table of contents.
 */
export class TableOfContentsWidget extends VDomRenderer<TableOfContents.IModel<
  TableOfContents.IHeading
> | null> {
  constructor(options: TableOfContents.IOptions) {
    super(options.model);
    this._rendermime = options.rendermime;
  }

  /**
   * Called to update the state of the widget.
   *
   * The default implementation of this method triggers
   * VDOM based rendering by calling the `renderDOM` method.
   */
  protected onUpdateRequest(msg: Message): void {
    // Will set renderPromise to resolve once ReactDOM.create is resolved
    super.onUpdateRequest(msg);
    this.renderPromise?.then(() => {
      if (this.model?.usesLatex && this._rendermime.latexTypesetter) {
        this._rendermime.latexTypesetter.typeset(this.node);
      }
    });
  }

  render(): JSX.Element | null {
    if (!this.model) {
      return null;
    }

    return (
      <TOCTree
        activeHeading={this.model.activeHeading}
        headings={this.model.headings}
        onCollapseChange={(heading: TableOfContents.IHeading) => {
          this.model!.toggleCollapse(heading);
        }}
        setActiveHeading={(heading: TableOfContents.IHeading) => {
          this.model!.activeHeading = heading;
        }}
      ></TOCTree>
    );
  }

  private _rendermime: IRenderMimeRegistry;
}
