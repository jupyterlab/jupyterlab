import * as React from 'react';
import { VDomModel, VDomRenderer } from '@jupyterlab/ui-components';
import {
  Button,
  /*DataGrid,
  DataGridCell,
  DataGridRow,*/
  Search
} from '@jupyter/react-components';
import { useState } from 'react';

interface IProps {
  model: DriveListModel;
}

/*export function CustomDataGrid() {


  return (
    <div id="data-grid-added-drives">
      <DataGrid grid-template-columns=  "1f 1fr" >
        <DataGridRow row-type="header">
          <DataGridCell grid-column="1">Header 1</DataGridCell>
          <DataGridCell grid-column="2">Header 2</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridCell grid-column="1">1.1</DataGridCell>
          <DataGridCell grid-column="2">1.2</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridCell grid-column="1">2.1</DataGridCell>
          <DataGridCell grid-column="2">2.2</DataGridCell>
        </DataGridRow>
      </DataGrid>
    </div>
  );
}*/

export function DriveListComponent(props: IProps) {
  const { model } = props;
  const [filteredList, setFilteredList] = useState(['']);

  const filterBySearch = (event: any) => {
    const query = event.target.value;
    let updatedList = [...model.driveList];
    updatedList = updatedList.filter(item => {
      return item.toLowerCase().indexOf(query.toLowerCase()) !== -1;
    });
    setFilteredList(updatedList);
    console.log('updatedList:', updatedList);
  };

  const addDriveToTree = (item: string) => {
    const list: Array<string> = [];
    list.push(item);
    console.log('list is:', list);
  };

  return (
    <div>
      <div className="jp-AddDrive-Header">
        <h3> Add drives to your filebrowser </h3>
      </div>
      <p> Enter a driveUrl </p>
      <Search />
      <p>Select drive(s) from list</p>
      <Search onInput={filterBySearch} />

      <div id="item-list">
        <ol>
          {filteredList.map((item, index) => (
            <li key={index}>
              {item}
              <Button onClick={() => addDriveToTree(item)} type="submit">
                add drive
              </Button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export class DriveListModel extends VDomModel {
  public driveList: string[];

  constructor(driveList: string[]) {
    super();
    this.driveList = driveList;
  }
}

export class DriveListView extends VDomRenderer<DriveListModel> {
  constructor(model: DriveListModel) {
    super(model);
    this.model = model;
  }
  render() {
    return (
      <>
        <DriveListComponent model={this.model} />
      </>
    );
  }
}
