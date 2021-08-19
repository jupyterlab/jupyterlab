// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IWidgetTracker, MainAreaWidget } from '@jupyterlab/apputils';
import { Token } from '@lumino/coreutils';
import { SettingEditor } from './settingeditor';
import { SettingEditorRegistry } from './SettingEditorRegistry';

/* tslint:disable */
/**
 * The setting editor tracker token.
 */
export const ISettingEditorTracker = new Token<ISettingEditorTracker>(
  '@jupyterlab/settingeditor:ISettingEditorTracker'
);
/* tslint:enable */

export interface ISettingEditorRegistry {
  addRenderer: (
    id: string,
    renderer: (props: SettingEditorRegistry.IRendererProps) => any
  ) => void;
  getRenderer: (
    id: string
  ) => (props: SettingEditorRegistry.IRendererProps) => any;
}

export const ISettingEditorRegistry = new Token<ISettingEditorRegistry>(
  '@jupyterlab/settingeditor:ISettingEditorRegistry'
);

/**
 * A class that tracks the setting editor.
 */
export interface ISettingEditorTracker
  extends IWidgetTracker<MainAreaWidget<SettingEditor>> {}
