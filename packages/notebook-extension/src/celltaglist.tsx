/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { NotebookPanel } from '@jupyterlab/notebook';
import React from 'react';
//import PropTypes from 'prop-types';
import { ReactWidget, VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';

interface IPropsFilterButton {
  onClick: () => void;
  sectionLabel: string;
  buttonLabel: string;
}

export function FilterButtonComponent(props: IPropsFilterButton) {
  return (
    <div>
      <p> {props.sectionLabel}</p>
      <button type="button" onClick={props.onClick}>
        {props.buttonLabel}
      </button>
    </div>
  );
}

export class FilterButtonWidget extends ReactWidget {
  private _commands: CommandRegistry;
  private _commandID: string;
  private _buttonLabel: string;
  private _sectionLabel: string;
  constructor(
    commands: CommandRegistry,
    commandID: string,
    sectionLabel: string,
    buttonLabel: string
  ) {
    super();
    this._commands = commands;
    this._commandID = commandID;
    this._sectionLabel = sectionLabel;
    this._buttonLabel = buttonLabel;
  }
  onClick = () => this._commands.execute(this._commandID);
  render() {
    return (
      <>
        <FilterButtonComponent
          onClick={this.onClick}
          sectionLabel={this._sectionLabel}
          buttonLabel={this._buttonLabel}
        />
      </>
    );
  }
}

/* Get the current widget and activate unless the args specify otherwise */
export function getNotebookTagList(notebookPanel: NotebookPanel) {
  const tagList: Array<string> = [];
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

export function getCellsTypeList(notebookPanel: NotebookPanel) {
  const typeList: Array<string> = [];
  notebookPanel?.content.widgets.forEach(cell => {
    const type = cell.model.type;
    if (!typeList.includes(type)) {
      typeList.push(type);
    }
  });
  return typeList;
}

interface IProps {
  model: CellTagListModel;
}

export function CellTagListComponent(props: IProps) {
  let { model } = props;
  model.setNotebookTagList(model.notebookPanel);
  const updatedCheckedDict = { ...model.tagCheckedDict };

  const handleCheck = (event: any) => {
    if (event.target.checked) {
      updatedCheckedDict[event.target.value] =
        !updatedCheckedDict[event.target.value];
    } else {
      updatedCheckedDict[event.target.value] =
        !updatedCheckedDict[event.target.value];
    }
  };

  model.updateTagCheckedDict(updatedCheckedDict);
  let isChecked = (item: any) =>
    updatedCheckedDict[item] === true ? 'checked-item' : 'not-checked-item';

  return (
    <div className="tag-list-component">
      {model.tagList.map((item, index) => {
        return (
          <ul key={index}>
            <div className="tag-list-item">
              <input
                type="checkbox"
                value={item}
                onChange={handleCheck}
                defaultChecked={model.tagCheckedDict[item]}
              />
              <span className={isChecked(item)}>{item}</span>
            </div>
          </ul>
        );
      })}
    </div>
  );
}

export class CellTagListModel extends VDomModel {
  public notebookPanel: NotebookPanel;
  public tagList: Array<string>;
  public tagCheckedDict: { [key: string]: boolean };
  public updatedTagCheckedDict: { [key: string]: boolean };

  constructor(notebookPanel: NotebookPanel) {
    super();
    this.notebookPanel = notebookPanel;
    this.tagList = getNotebookTagList(this.notebookPanel);
    this.tagList = this.tagList.concat(getCellsTypeList(this.notebookPanel));
  }

  updateTagCheckedDict(dict: { [key: string]: boolean }) {
    this.updatedTagCheckedDict = dict;
  }

  setNotebookTagList(notebookPanel: NotebookPanel) {
    this.tagList = getNotebookTagList(notebookPanel);
    this.tagList = this.tagList.concat(getCellsTypeList(notebookPanel));
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
        <h3> Filter cells with tags</h3>
        <CellTagListComponent model={this.model} />
      </>
    );
  }
}
