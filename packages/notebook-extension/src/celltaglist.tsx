/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { NotebookPanel } from '@jupyterlab/notebook';
import React from 'react';
import PropTypes from 'prop-types';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

/* Get the current widget and activate unless the args specify otherwise */
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

/* Check if 2 arrays have at least one common element and return true if that's the case*/

interface IProps {
  model: CellTagListModel;
}
export function CellTagListComponent(props: IProps) {
  let { model } = props;
  //const notebookPanel = model.notebookPanel;
  const checkedDict = { ...model.checkedDict };
  const updatedCheckedDict = checkedDict;

  const handleCheck = (event: any) => {
    if (event.target.checked) {
      updatedCheckedDict[event.target.value] =
        !updatedCheckedDict[event.target.value];
    } else {
      updatedCheckedDict[event.target.value] =
        !updatedCheckedDict[event.target.value];
    }

    model.setCheckedDict(updatedCheckedDict);
  };

  let isChecked = (item: any) =>
    updatedCheckedDict[item] === true ? 'checked-item' : 'not-checked-item';

  let tagList = [];
  for (let key in updatedCheckedDict) {
    tagList.push(key);
  }

  return (
    <div className="tag-list-component">
      <h3>Select cell tags</h3>
      {tagList.map((item, index) => {
        //console.log('item:', item);
        return (
          <ul key={index}>
            <div className="tag-list-item">
              <input
                type="checkbox"
                value={item}
                onChange={handleCheck}
                defaultChecked={model.checkedDict[item]}
              />
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
  public checkedDict: { [tag: string]: boolean };

  constructor(notebookPanel: NotebookPanel) {
    super();
    this.notebookPanel = notebookPanel;
    this.tagList = getNotebookTagList(notebookPanel);
  }
  setCheckedDict(dict: { [tag: string]: boolean }) {
    this.checkedDict = dict;
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
