// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget, DOMUtils } from '@jupyterlab/apputils';
import { userIcon, caretDownIcon, linkIcon } from '@jupyterlab/ui-components';
import {
  Clipboard,
  Dialog,
  showDialog
} from '@jupyterlab/apputils';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { AccordionPanel, Title, Widget } from '@lumino/widgets';

import * as React from 'react';

import { User } from './model';
import { getUserIcon } from './components';
import { requestAPI } from './utils';



export class UserSidePanel extends AccordionPanel {
  constructor() {
    super({ renderer: new UserSidePanel.Renderer() });
    this.id = DOMUtils.createDomID();
    this.title.icon = userIcon;
    this.addClass('jp-UserSidePanel');
  }
}

/**
 * Debugger accordion panel customization
 */
export namespace UserSidePanel {
  /**
   * Custom renderer for the debugger sidebar
   */
  export class Renderer extends AccordionPanel.Renderer {
    /**
     * Render the collapse indicator for a section title.
     *
     * @param data - The data to use for rendering the section title.
     *
     * @returns A element representing the collapse indicator.
     */
    createCollapseIcon(data: Title<Widget>): HTMLElement {
      const iconDiv = document.createElement('div');
      caretDownIcon.element({
        container: iconDiv
      });
      return iconDiv;
    }
  }
}

export class SharePanel extends ReactWidget {
  private _profile: User;
  private _collaborators: User.User[];

  constructor(user: User) {
    super();
    this.id = DOMUtils.createDomID();
    this.title.label = 'Share Notebook';
    this.title.caption = `Share the open notebook to other collaborators`;

    this._profile = user;
    this._collaborators = [];
  }

  set documentName(name: string) {
    if (name == "") {
      this.title.label = 'Share Notebook';
    } else {
      this.title.label = name;
    }
    this.update();
  }

  get collaborators(): User.User[] {
    return this._collaborators;
  }

  set collaborators(users: User.User[]) {
    this._collaborators = users;
    this.update();
  }

  private _showLinks = async () => {
    const results: { token: string }[] = await requestAPI<any>('api/share');
    const links = results.map( server => {
      return URLExt.normalize(
        `${PageConfig.getUrl({
          treePath: this.title.label || "",
          workspace: PageConfig.defaultWorkspace
        })}?token=${server.token}`
      );
    });

    const entries = document.createElement('div');
    links.map(link => {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = link;
      a.innerText = link;
      p.appendChild(a);
      entries.appendChild(p);
    });

    const result = await showDialog({
      title: 'Share Jupyter Server Link',
      body: new Widget({ node: entries }),
      buttons: [
        Dialog.cancelButton({ label: 'Cancel' }),
        Dialog.okButton({
          label: 'Copy',
          caption: 'Copy the link to the Jupyter Server'
        })
      ]
    });
    if (result.button.accept) {
      Clipboard.copyToSystem(links[0]);
    }
  }

  render(): JSX.Element {
    return (
      <div className="jp-SharePanel">
        <div className="jp-SharePanel-Link">
          <button
            onClick={this._showLinks}
            className="jp-Button"
          >
            <linkIcon.react className="jp-SharePanel-Link-Icon" />
            <span className="bp3-button-text">Share document</span>
          </button>
        </div>
        
        
        <h4>Collaborators</h4>
        <hr />
        <div className="">
          {this._collaborators.map(user => {
            if (this._profile.username !== user.username) {
              return getUserIcon(user);
            }
          })}
        </div>
      </div>
    );
  }
}
