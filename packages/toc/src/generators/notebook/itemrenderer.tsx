// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { Cell } from '@jupyterlab/cells';

import { INotebookTracker } from '@jupyterlab/notebook';

import { sanitizerOptions } from '../../utils/sanitizer_options';

import { INotebookHeading } from '../../utils/headings';

import { CodeComponent } from './codemirror';

import { NotebookGeneratorOptionsManager } from './optionsmanager';

import { setCollapsedState } from './set_collapsed_state';

export function notebookItemRenderer(
  options: NotebookGeneratorOptionsManager,
  tracker: INotebookTracker,
  item: INotebookHeading
) {
  let jsx;
  if (item.type === 'markdown' || item.type === 'header') {
    const collapseOnClick = (cellRef?: Cell) => {
      let collapsed;
      if (cellRef!.model.metadata.has('toc-hr-collapsed')) {
        collapsed = cellRef!.model.metadata.get('toc-hr-collapsed') as boolean;
        cellRef!.model.metadata.delete('toc-hr-collapsed');
      } else {
        collapsed = false;
        cellRef!.model.metadata.set('toc-hr-collapsed', true);
      }
      if (cellRef) {
        // NOTE: we can imagine a future in which this extension combines with a collapsible-header/ings extension such that we can programmatically close notebook "sections" according to a public API specifically intended for collapsing notebook sections. In the meantime, we need to resort to manually "collapsing" sections...
        setCollapsedState(tracker, cellRef, !collapsed);
      }
      options.updateWidget();
    };
    let fontSizeClass = 'toc-level-size-default';
    let numbering = item.numbering && options.numbering ? item.numbering : '';
    if (item.type === 'header') {
      fontSizeClass = 'toc-level-size-' + item.level;
    }
    if (item.html && (item.type === 'header' || options.showMarkdown)) {
      jsx = (
        <span
          dangerouslySetInnerHTML={{
            __html:
              numbering +
              options.sanitizer.sanitize(item.html, sanitizerOptions)
          }}
          className={item.type + '-cell toc-cell-item ' + fontSizeClass}
        />
      );
      // Render the headers
      if (item.type === 'header') {
        let collapsed = item.cellRef!.model.metadata.get(
          'toc-hr-collapsed'
        ) as boolean;
        collapsed = collapsed != undefined ? collapsed : false;

        // Render the twist button
        let twistButton;
        if (collapsed) {
          twistButton = (
            <div
              className="toc-collapse-button"
              onClick={event => {
                event.stopPropagation();
                collapseOnClick(item.cellRef);
              }}
            >
              <div className="toc-twist-placeholder">placeholder</div>
              <div className="toc-rightarrow-img toc-arrow-img" />
            </div>
          );
        } else {
          twistButton = (
            <div
              className="toc-collapse-button"
              onClick={event => {
                event.stopPropagation();
                collapseOnClick(item.cellRef);
              }}
            >
              <div className="toc-twist-placeholder">placeholder</div>
              <div className="toc-downarrow-img toc-arrow-img" />
            </div>
          );
        }
        // Render the header item
        jsx = (
          <div className="toc-entry-holder">
            {twistButton}
            {jsx}
          </div>
        );
      }
    } else if (item.type === 'header' || options.showMarkdown) {
      // Render headers/markdown for plain text
      jsx = (
        <span className={item.type + '-cell toc-cell-item ' + fontSizeClass}>
          {numbering + item.text}
        </span>
      );
      if (item.type === 'header') {
        let collapsed = item.cellRef!.model.metadata.get(
          'toc-hr-collapsed'
        ) as boolean;
        collapsed = collapsed != undefined ? collapsed : false;
        let twistButton;
        if (collapsed) {
          twistButton = (
            <div
              className="toc-collapse-button"
              onClick={event => {
                event.stopPropagation();
                collapseOnClick(item.cellRef);
              }}
            >
              <div className="toc-twist-placeholder">placeholder</div>
              <div className="toc-rightarrow-img toc-arrow-img" />
            </div>
          );
        } else {
          twistButton = (
            <div
              className="toc-collapse-button"
              onClick={event => {
                event.stopPropagation();
                collapseOnClick(item.cellRef);
              }}
            >
              <div className="toc-twist-placeholder">placeholder</div>
              <div className="toc-downarrow-img toc-arrow-img" />
            </div>
          );
        }
        jsx = (
          <div className="toc-entry-holder">
            {twistButton}
            {jsx}
          </div>
        );
      }
    } else {
      jsx = null;
    }
  } else if (item.type === 'code' && options.showCode) {
    // Render code cells
    jsx = (
      <div className="toc-code-cell-div">
        <div className="toc-code-cell-prompt">{item.prompt}</div>
        <span className={'toc-code-span'}>
          <CodeComponent sanitizer={options.sanitizer} heading={item} />
        </span>
      </div>
    );
  } else {
    jsx = null;
  }
  return jsx;
}
