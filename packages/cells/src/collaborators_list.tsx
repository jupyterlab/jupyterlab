/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as React from 'react';

import { ReactWidget } from '@jupyterlab/ui-components';
import { IUser, getInitials } from '@jupyterlab/user';

/**
 * The CSS class added to collaborators list container.
 */
const COLLABORATORS_LIST_CLASS = 'jp-CollaboratorsList';

/**
 * The CSS class added to each collaborator icon.
 */
const COLLABORATOR_CLASS = 'jp-Collaborator';

/**
 * A class for cell collaborators list widget
 *
 * ### Notes
 * A list of icons showing the current collaborators for a cell.
 */
export class CollaboratorsList extends ReactWidget {
  /**
   * Construct a new collaborators list widget.
   */
  constructor() {
    super();
    this.addClass(COLLABORATORS_LIST_CLASS);
  }

  /**
   * The current collaborators list value.
   */
  set collaborators(value: IUser.User[]) {
    this._collaborators = value;
    this.update();
  }
  get collaborators(): IUser.User[] {
    return this._collaborators;
  }

  /**
   * Render the collaborators list using the virtual DOM.
   */
  protected render(): React.ReactElement<any>[] {
    return this._collaborators.map(function(user, i){
        return <div className={COLLABORATOR_CLASS} key={i} style={{backgroundColor: user.color}} title={`${user.givenName} ${user.familyName}`}>
            {getInitials(user.givenName, user.familyName)}
        </div>;
    });
  }

  private _collaborators: IUser.User[] = [];
}
