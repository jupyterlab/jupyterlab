// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget, DOMUtils } from '@jupyterlab/apputils';
import { ToolbarButton, linkIcon } from '@jupyterlab/ui-components';
import {
  Clipboard,
  Dialog,
  showDialog
} from '@jupyterlab/apputils';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { Widget } from '@lumino/widgets';

import * as React from 'react';

import { IUser } from './tokens';
import { requestAPI } from './utils';
import { getUserIcon } from './components';
import { PanelWithToolbar } from './panelwithtoolbar';


export class ShareDocumentPanel extends PanelWithToolbar {
	private _body: ShareDocumentBody;

  constructor(user: IUser) {
    super({});
    this.title.label = 'Share Notebook';
    this.title.caption = `Share the open notebook to other collaborators`;
    this.addClass('jp-ShareDocumentPanel');

    this.toolbar.addItem(
      'showLinks',
      new ToolbarButton({
        icon: linkIcon,
        onClick: () => this._showLinks(),
        tooltip: this.trans.__('Remove All Breakpoints')
      })
    );

		this._body = new ShareDocumentBody(user);

    this.addWidget(this._body);
  }

  set documentName(name: string) {
    if (name == "") {
      this.title.label = 'Share Notebook';
    } else {
      this.title.label = name;
    }
    this.update();
  }

  set scrollToCollaborator(f: any) {
    this._body.scrollToCollaborator = f;
  }

  public getCollaborator(id: string): IUser.User | undefined {
    return this._body.getCollaborator(id);
  }

  public setCollaborator(collaborator: IUser.User): void {
    this._body.setCollaborator(collaborator);
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
}

class ShareDocumentBody extends ReactWidget {
  private _profile: IUser;
  private _collaborators: Map<string, IUser.User>;
  private _scrollToCollaborator: (id: string) => {};

  constructor(user: IUser) {
    super({});
    this.id = DOMUtils.createDomID();
    this.title.label = 'Share Notebook';
    this.title.caption = `Share the open notebook to other collaborators`;

    this._profile = user;
    this._collaborators = new Map<string, IUser.User>();
  }

  set documentName(name: string) {
    if (name == "") {
      this.title.label = 'Share Notebook';
    } else {
      this.title.label = name;
    }
    this.update();
  }

  set scrollToCollaborator(f: any) {
    this._scrollToCollaborator = f;
  }

  public getCollaborator(id: string): IUser.User | undefined {
    return this._collaborators.get(id);
  }

  public setCollaborator(collaborator: IUser.User): void {
    this._collaborators.set(collaborator.id, collaborator);
  }

  render(): JSX.Element {
    return (
      <div className="jp-SharePanel">
        <h4>Collaborators</h4>
        <hr />
        <div className="">
          {[...this._collaborators.values()].map( user => {
            console.debug("Profile:", this._profile.id);
            console.debug("USER:", user);
            if (this._profile.id !== user.id) {
              return (
                <div
                  key={user.id}
                  onClick={() => this._scrollToCollaborator(user.id)}
                >
                  {getUserIcon(user)}
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  }
}