// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { Awareness } from 'y-protocols/awareness';

import { Panel } from '@lumino/widgets';

import { ReactWidget } from '@jupyterlab/apputils';

import { ICurrentUser } from './tokens';
import { ICollaboratorAwareness } from './utils';
import { PathExt } from '@jupyterlab/coreutils';

/**
 * The CSS class added to collaborators list container.
 */
const COLLABORATORS_LIST_CLASS = 'jp-CollaboratorsList';

/**
 * The CSS class added to each collaborator element.
 */
const COLLABORATOR_CLASS = 'jp-Collaborator';

/**
 * The CSS class added to each collaborator element.
 */
const CLICKABLE_COLLABORATOR_CLASS = 'jp-ClickableCollaborator';

/**
 * The CSS class added to each collaborator icon.
 */
const COLLABORATOR_ICON_CLASS = 'jp-CollaboratorIcon';

export class CollaboratorsPanel extends Panel {
  private _currentUser: ICurrentUser;
  private _awareness: Awareness;
  private _body: CollaboratorsBody;

  constructor(
    currentUser: ICurrentUser,
    awareness: Awareness,
    fileopener: (path: string) => void
  ) {
    super({});

    this._awareness = awareness;

    this.title.label = 'Online Collaborators';

    this._currentUser = currentUser;

    this._body = new CollaboratorsBody(fileopener);
    this.addWidget(this._body);
    this.update();

    this._awareness.on('change', this._onAwarenessChanged);
  }

  /**
   * Handle collaborator change.
   */
  private _onAwarenessChanged = () => {
    const state = this._awareness.getStates();
    const collaborators: ICollaboratorAwareness[] = [];

    state.forEach((value: ICollaboratorAwareness, key: any) => {
      if (value.user.name !== this._currentUser.name) {
        collaborators.push(value);
      }
    });

    this._body.collaborators = collaborators;
  };
}

/**
 * The collaborators list.
 */
export class CollaboratorsBody extends ReactWidget {
  private _collaborators: ICollaboratorAwareness[] = [];
  private _fileopener: (path: string) => void;

  constructor(fileopener: (path: string) => void) {
    super();
    this._fileopener = fileopener;
    this.addClass(COLLABORATORS_LIST_CLASS);
  }

  get collaborators(): ICollaboratorAwareness[] {
    return this._collaborators;
  }

  set collaborators(value: ICollaboratorAwareness[]) {
    this._collaborators = value;
    this.update();
  }

  render(): React.ReactElement<any>[] {
    return this._collaborators.map((value, i) => {
      let canOpenCurrent = false;
      let current = '';
      let separator = '';
      let currentFileLocation = '';

      if (value.current) {
        canOpenCurrent = true;
        currentFileLocation = value.current.split(':')[1];

        current = PathExt.basename(currentFileLocation);
        current =
          current.length > 25 ? current.slice(0, 12).concat(`…`) : current;
        separator = '•';
      }

      const onClick = () => {
        if (canOpenCurrent) {
          this._fileopener(currentFileLocation);
        }
      };

      const displayName = `${
        value.user.displayName != '' ? value.user.displayName : value.user.name
      } ${separator} ${current}`;

      return (
        <div
          className={
            canOpenCurrent
              ? `${CLICKABLE_COLLABORATOR_CLASS} ${COLLABORATOR_CLASS}`
              : COLLABORATOR_CLASS
          }
          key={i}
          onClick={onClick}
        >
          <div
            className={COLLABORATOR_ICON_CLASS}
            style={{ backgroundColor: value.user.color }}
          >
            <span>{value.user.initials}</span>
          </div>
          <span>{displayName}</span>
        </div>
      );
    });
  }
}
