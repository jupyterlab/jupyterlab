// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget, DOMUtils } from '@jupyterlab/apputils';
import { YNotebook } from '@jupyterlab/shared-models';
import { getUserIcon } from '@jupyterlab/user';
import * as Y from 'yjs';

import * as React from 'react';

import { Notebook } from './widget';
import { NotebookActions } from './actions';


export class ColaboratorsHeader extends ReactWidget {
  private _notebook: Notebook;
	private _collaborators: any[];

  constructor(notebook: Notebook) {
    super({});
    this.id = DOMUtils.createDomID();
    this.title.caption = 'List of collaborators in notebook';
    this.addClass("jp-NotebookPanel-header-collaborators");

		this._collaborators = [];
    this._notebook = notebook;
		this._notebook.modelChanged.connect(this._onModelChanged);
  }

	dispose() {
		this._notebook.modelChanged.disconnect(this._onModelChanged);
	}

	private _onModelChanged = (sender: Notebook): void => {
		console.debug("_onModelChanged");

		if (sender.model) {
			const model = (sender.model.sharedModel as YNotebook)
			model.awareness.on('change', () => {
				const state = model.awareness.getStates();

        state.forEach((value, key) => {
          console.debug("State:", value);
          // TODO: Only for debugging (We want to keep the las position)
          // Later, create a new list every time
          let indexCollaborator = this._collaborators.findIndex((user) => user.id === value.user.id);
          let collaborator;
          console.debug(collaborator);
          
					if (indexCollaborator !== -1) {
            collaborator = this._collaborators[indexCollaborator];
          } else {
            collaborator = {
              id: value.user.id,
              anonymous: value.user.anonymous,
              name: value.user.name,
              username: value.user.username,
              color: value.user.color,
              role: value.user.role
            };
          }
          
          if (value?.cursor?.head) {
            console.debug("Cursor:", value.cursor);
            // TODO: read selection instead of position?
            // and create codemirror.IRange
            const pos = Y.createAbsolutePositionFromRelativePosition(JSON.parse(value.cursor.head), model.ydoc);
            const cell = pos?.type.parent;
            if (pos && cell) {
              console.debug("POS:", cell.toJSON());
              const cellIndex = (model as YNotebook).ycells.toArray().findIndex((item) => {
                console.debug("Cell:", item.toJSON());
                return item === cell;
              });
              console.debug("Scrolling", cellIndex, pos.index);
              collaborator.cursor = { cell: cellIndex, index: pos.index };
            }
          }

          // TODO: Only for debugging (We want to keep the las position)
          // Later, create a new list every time
          if (indexCollaborator !== -1) {
            this._collaborators[indexCollaborator] = collaborator;
          } else {
            this._collaborators.push(collaborator);
          }
        });

        this.update();
			})
		}
	}

  render(): JSX.Element {
    console.debug("Collaborators:", this._collaborators);
    return (
      <div className="jp-NotebookPanel-header-collaborators-container">
        {this._collaborators.map( user => {
            console.debug("USER:", user);
            return (
							<div
								key={user.id}
								onClick={() => NotebookActions.scrollToCollaborator(this._notebook, user.cursor)}
							>
								{getUserIcon(user)}
							</div>
						);
          })}
      </div>
    );
  }
}
