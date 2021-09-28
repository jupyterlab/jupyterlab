import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { CommandRegistry } from '@lumino/commands';

import { IDisposable } from '@lumino/disposable';

import { Menu } from '@lumino/widgets';

import { ShortcutUI } from './components';
import React from 'react';

/** All external actions, setting commands, getting command list ... */
export interface IShortcutUIexternal {
  getAllShortCutSettings: () => Promise<ISettingRegistry.ISettings>;
  removeShortCut: (key: string) => Promise<void>;
  openAdvanced: () => void;
  createMenu: () => Menu;
  hasCommand: (id: string) => boolean;
  addCommand: (
    id: string,
    options: CommandRegistry.ICommandOptions
  ) => IDisposable;
  getLabel: (id: string) => string;
}

export const renderShortCut = (props: any) => {
  return <ShortcutUI external={props.external} height={1000} width={1000} />;
};
