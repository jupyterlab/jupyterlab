// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker } from '@jupyterlab/apputils';
import { Token } from '@lumino/coreutils';
import { JsonSettingEditor } from './jsonsettingeditor';
import { SettingsEditor } from './settingseditor';

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
  extends IWidgetTracker<JsonSettingEditor> {}

/**
 * A class that tracks the setting editor.
 */
export interface ISettingEditorTracker extends IWidgetTracker<SettingsEditor> {}
