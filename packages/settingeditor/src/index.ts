// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IInstanceTracker, MainAreaWidget
} from '@jupyterlab/apputils';

import {
  Token
} from '@phosphor/coreutils';

import {
  SettingEditor
} from './settingeditor';

import '../style/settingeditor.css';

export * from './settingeditor';


/* tslint:disable */
/**
 * The setting editor tracker token.
 */
export
const ISettingEditorTracker = new Token<ISettingEditorTracker>('@jupyterlab/settingeditor:ISettingEditorTracker');
/* tslint:enable */


/**
 * A class that tracks the setting editor.
 */
export
interface ISettingEditorTracker extends IInstanceTracker<MainAreaWidget<SettingEditor>> {}
