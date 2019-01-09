// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeComponent } from './codemirror';

import { Cell } from '@jupyterlab/cells';

import { NotebookGeneratorOptionsManager } from './optionsmanager';

import { INotebookHeading } from './heading';

import { sanitizerOptions } from '../shared';

import * as React from 'react';

export function notebookItemRenderer(
  options: NotebookGeneratorOptionsManager,
  item: INotebookHeading
) {
  let jsx;
  if (item.type === 'markdown' || item.type === 'header') {
    const collapseOnClick = (cellRef?: Cell) => {
      let collapsed = cellRef!.model.metadata.get(
        'toc-hr-collapsed'
      ) as boolean;
      collapsed = collapsed != undefined ? collapsed : false;
      cellRef!.model.metadata.set('toc-hr-collapsed', !collapsed);
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
        let twistButton = (
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
        }
        // Render the header item
        jsx = (
          <div className="toc-entry-holder">
            {item.hasChild && twistButton}
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
        let twistButton = (
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
        }
        jsx = (
          <div className="toc-entry-holder">
            {item.hasChild && twistButton}
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
