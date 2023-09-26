/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { NotebookPanel } from '@jupyterlab/notebook';
import React from 'react';
import PropTypes from 'prop-types';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

// Get the current widget and activate unless the args specify otherwise.

export function getNotebookTagList(notebookPanel: NotebookPanel) {
  let tagList: Array<string> = [];
  notebookPanel?.content.widgets.forEach(cell => {
    const tags: any = cell.model.getMetadata('tags');
    for (let i = 0; i < tags.length; i++) {
      if (!tagList.includes(tags[i])) {
        tagList.push(tags[i]);
      }
    }
  });
  return tagList;
}

interface IProps {
  model: CellTagListModel;
}
export function CellTagListComponent(props: IProps) {
  let { model } = props;
  const notebookPanel = model.notebookPanel;

  const handleCheck = (event: any) => {
    let updatedList = [...model.checkedList];

    if (event.target.checked) {
      updatedList = [...model.checkedList, event.target.value];
      notebookPanel?.content.widgets.forEach(cell => {
        let isCollapsed = false;
        if (cell.model.getMetadata('tags').includes(event.target.value)) {
          cell.setHidden(!isCollapsed);
        }
      });
    } else {
      updatedList.splice(model.checkedList.indexOf(event.target.value), 1);
      notebookPanel?.content.widgets.forEach(cell => {
        let isCollapsed = true;
        cell.setHidden(!isCollapsed);
      });
    }

    model.setCheckedList(updatedList);
    model.stateChanged;
  };

  let isChecked = (item: any) =>
    model.checkedList.includes(item) ? 'checked-item' : 'not-checked-item';

  // Return classes based on whether item is checked

  return (
    <div className="tag-list-component">
      <h3>Select cell tags</h3>
      {model.tagList.map((item, index) => {
        return (
          <ul key={index}>
            <div className="tag-list-item">
              <input type="checkbox" value={item} onChange={handleCheck} />
              <span className={isChecked(item)}>{item}</span>
            </div>
          </ul>
        );
      })}
    </div>
  );
}

CellTagListComponent.propTypes = {
  tagList: PropTypes.array
};

export class CellTagListModel extends VDomModel {
  public notebookPanel: NotebookPanel;
  public tagList: Array<string>;
  public checkedList: Array<string>;

  constructor(notebookPanel: NotebookPanel, checkedList: Array<string>) {
    super();
    this.notebookPanel = notebookPanel;
    this.tagList = getNotebookTagList(notebookPanel);
    this.checkedList = checkedList;
  }
  setCheckedList(list: Array<string>) {
    this.checkedList = list;
  }
}

export class CellTagListView extends VDomRenderer<CellTagListModel> {
  constructor(model: CellTagListModel) {
    super(model);
    this.model = model;
  }

  render() {
    return (
      <>
        <CellTagListComponent model={this.model} />
      </>
    );
  }
}
