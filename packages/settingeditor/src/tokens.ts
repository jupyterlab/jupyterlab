// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker, MainAreaWidget } from '@jupyterlab/apputils';
import { Token } from '@lumino/coreutils';
import { JsonSettingEditor as JSONSettingEditor } from './jsonsettingeditor';
import { SettingsEditor } from './settingseditor';

/**
 * The setting editor tracker token.
 */
export const ISettingEditorTracker = new Token<ISettingEditorTracker>(
  '@jupyterlab/settingeditor:ISettingEditorTracker',
  `A widget tracker for the interactive setting editor.
  Use this if you want to be able to iterate over and interact with setting editors
  created by the application.`
);

/**
 * The setting editor tracker token.
 */
export const IJSONSettingEditorTracker = new Token<IJSONSettingEditorTracker>(
  '@jupyterlab/settingeditor:IJSONSettingEditorTracker',
  `A widget tracker for the JSON setting editor.
  Use this if you want to be able to iterate over and interact with setting editors
  created by the application.`
);

/**
 * A class that tracks the setting editor.
 */
export interface IJSONSettingEditorTracker
  extends IWidgetTracker<MainAreaWidget<JSONSettingEditor>> {}

/**
 * A class that tracks the setting editor.
 */
export interface ISettingEditorTracker
  extends IWidgetTracker<MainAreaWidget<SettingsEditor>> {}
