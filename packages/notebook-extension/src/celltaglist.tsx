import { NotebookPanel } from '@jupyterlab/notebook';
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ReactWidget } from '@jupyterlab/apputils';

// Get the current widget and activate unless the args specify otherwise.

interface IProps {
  notebookPanel: NotebookPanel;
}

export function CellTagListComponent(props: IProps) {
  const { notebookPanel } = props;
  let tagList: Array<string> = [];
  notebookPanel?.content.widgets.forEach(cell => {
    const tags: any = cell.model.getMetadata('tags');
    for (let i = 0; i < tags.length; i++) {
      if (!tagList.includes(tags[i])) {
        tagList.push(tags[i]);
      }
    }
  });

  const [checked, setChecked] = useState(['']);

  const handleCheck = (event: any) => {
    let updatedList = [...checked];

    if (event.target.checked) {
      updatedList = [...checked, event.target.value];
      notebookPanel?.content.widgets.forEach(cell => {
        if (cell.model.getMetadata('tags').includes(event.target.value))
          cell.inputHidden;
      });
    } else {
      updatedList.splice(checked.indexOf(event.target.value), 1);
    }
    setChecked(updatedList);
  };

  // Return classes based on whether item is checked
  let isChecked = (item: any) =>
    checked.includes(item) ? 'checked-item' : 'not-checked-item';

  return (
    <div className="tag-list-component">
      <h3>Select cell tags</h3>
      {tagList.map((item, index) => {
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

export class CellTagListWidget extends ReactWidget {
  public notebookPanel;
  constructor(notebookPanel: NotebookPanel) {
    super();
    this.notebookPanel = notebookPanel;
  }
  render() {
    return (
      <>
        <CellTagListComponent notebookPanel={this.notebookPanel} />
      </>
    );
  }
}
