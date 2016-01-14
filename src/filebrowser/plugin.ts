// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowserWidget, FileBrowserModel
} from 'jupyter-js-filebrowser';

import {
  Container, IFactory, Lifetime, Token
} from 'phosphor-di';

import {
  IFileBrowserWidget
} from './index';

import {
  IServicesProvider
} from '../index';

import './plugin.css';


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function register(container: Container): void {
  container.register(IFileBrowserWidget, fileBrowserFactory);
}


const fileBrowserFactory: IFactory<IFileBrowserWidget> = {
  lifetime: Lifetime.Singleton,
  requires: [IServicesProvider],
  create: (provider: IServicesProvider): IFileBrowserWidget => {
    let contents = provider.contentsManager;
    let sessions = provider.notebookSessionManager;
    let model = new FileBrowserModel(contents, sessions);
    return new FileBrowserWidget(model);
  }
}
