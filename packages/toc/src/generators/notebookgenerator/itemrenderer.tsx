// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeComponent } from './codemirror';

import { Cell } from '@jupyterlab/cells';

import { NotebookGeneratorOptionsManager } from './optionsmanager';

import {
  sanitizerOptions,
  INotebookHeading,
  INotebookHeadingTypes
} from '../shared';

import * as React from 'react';

export function notebookItemRenderer(
  options: NotebookGeneratorOptionsManager,
  item: INotebookHeading
) {
  const levelsSizes: { [level: number]: string } = {
    1: '18.74',
    2: '16.02',
    3: '13.69',
    4: '12',
    5: '11',
    6: '10'
  };
  let jsx;
  if (
    item.type === INotebookHeadingTypes.markdown ||
    item.type === INotebookHeadingTypes.header
  ) {
    const collapseOnClick = (cellRef?: Cell) => {
      let collapsed = cellRef!.model.metadata.get(
        'toc-hr-collapsed'
      ) as boolean;
      collapsed = collapsed != undefined ? collapsed : false;
      cellRef!.model.metadata.set('toc-hr-collapsed', !collapsed);
      options.updateWidget();
    };
    let fontSize = '9px';
    let numbering = item.numbering && options.numbering ? item.numbering : '';
    if (item.type === INotebookHeadingTypes.header) {
      fontSize = levelsSizes[item.level] + 'px';
    }
    if (
      item.html &&
      (item.type === INotebookHeadingTypes.header || options.showMarkdown)
    ) {
      jsx = (
        <span
          dangerouslySetInnerHTML={{
            __html:
              numbering +
              options.sanitizer.sanitize(item.html, sanitizerOptions)
          }}
          className={item.type + '-cell toc-cell-item'}
          style={{ fontSize }}
        />
      );
      // Render the headers
      if (item.type === INotebookHeadingTypes.header) {
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
            <img
              className="toc-arrow-img"
              src={require('../../../style/img/downarrow.svg')}
            />
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
              <img
                className="toc-arrow-img"
                src={require('../../../style/img/rightarrow.svg')}
              />
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
    } else if (
      item.type === INotebookHeadingTypes.header ||
      options.showMarkdown
    ) {
      // Render headers/markdown for plain text
      jsx = (
        <span
          className={item.type + '-cell toc-cell-item'}
          style={{ fontSize }}
        >
          {numbering + item.text}
        </span>
      );
      if (item.type === INotebookHeadingTypes.header) {
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
            <img
              className="toc-arrow-img"
              src={require('../../../style/img/downarrow.svg')}
            />
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
              <img
                className="toc-arrow-img"
                src={require('../../../style/img/rightarrow.svg')}
              />
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
  } else if (item.type === INotebookHeadingTypes.code && options.showCode) {
    // Render code cells
    jsx = (
      <div className="toc-code-cell-div">
        <div className="toc-code-cell-prompt">{item.prompt}</div>
        <span className={'toc-code-span'}>
          <CodeComponent heading={item} />
        </span>
      </div>
    );
  } else {
    jsx = null;
  }
  return jsx;
}
