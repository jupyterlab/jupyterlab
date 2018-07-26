import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import * as React from 'react'

import { ShortcutUI } from './components/ShortcutUI';

import { ISettingRegistry } from '@jupyterlab/coreutils';

import { CommandRegistry } from '@phosphor/commands';

import { Widget, Title } from '@phosphor/widgets';

import * as ReactDOM from 'react-dom';

export default class ShortcutWidget extends VDomRenderer<VDomModel> {
  height: number;
  width: number;
  commandList: string[];
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
  commandRegistry: CommandRegistry;
  id: string;
  isAttached: boolean;
  title: Title<Widget>;
  reactComponent: React.ReactElement<any>;

  constructor(
    height: number, 
    width: number, 
    commandList: string[], 
    settingRegistry: ISettingRegistry,
    commandRegistry: CommandRegistry,
    shortcutPlugin: string,
  ) {
    super();
    this.height = height;
    this.width = width;
    this.commandList = commandList;
    this.settingRegistry = settingRegistry;
    this.commandRegistry = commandRegistry;
    this.shortcutPlugin = shortcutPlugin;
  }

  protected onUpdateRequest(): void {
    this.reactComponent = 
      <ShortcutUI
        commandList={this.commandList}
        settingRegistry={this.settingRegistry}
        shortcutPlugin={this.shortcutPlugin}
        commandRegistry={this.commandRegistry}
        height={this.height}
        width={this.width}
      />
    ReactDOM.render(
      this.reactComponent, 
      document.getElementById('jupyterlab-shortcutui')
    )
    this.render();
  }

  protected onResize(msg: Widget.ResizeMessage): void {
    this.height = msg.height;
    this.width = msg.width;
    super.update()
  }

  render() {
    return this.reactComponent
  }
}