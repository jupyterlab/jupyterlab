// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker, MainAreaWidget } from '@jupyterlab/apputils';
import { Token } from '@lumino/coreutils';
import { SettingEditor } from './jsonsettingeditor';
import { SimpleSettingsEditor } from './settingseditor';

/* tslint:disable */
/**
 * The setting editor tracker token.
 */
export const ISettingEditorTracker = new Token<ISettingEditorTracker>(
  '@jupyterlab/settingeditor:ISettingEditorTracker'
);

/**
 * The setting editor tracker token.
 */
export const IJSONSettingEditorTracker = new Token<IJSONSettingEditorTracker>(
  '@jupyterlab/settingeditor:IJSONSettingEditorTracker'
);
/* tslint:enable */

/**
 * A class that tracks the setting editor.
 */
export interface IJSONSettingEditorTracker
  extends IWidgetTracker<MainAreaWidget<SettingEditor>> {}

/**
 * A class that tracks the setting editor.
 */
export interface ISettingEditorTracker
  extends IWidgetTracker<MainAreaWidget<SimpleSettingsEditor>> {}
