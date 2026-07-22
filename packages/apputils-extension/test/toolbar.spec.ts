// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { MainAreaWidget, Toolbar } from '@jupyterlab/apputils';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { nullTranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { Signal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import plugins from '../src/index';

describe('@jupyterlab/apputils-extension:toggle-toolbar', () => {
  const command = 'apputils:toggle-toolbar';
  const plugin = plugins.find(
    candidate =>
      candidate.id === '@jupyterlab/apputils-extension:toggle-toolbar'
  ) as JupyterFrontEndPlugin<void>;

  let commands: CommandRegistry;
  let shell: { currentWidget: Widget | null };
  let app: JupyterFrontEnd;

  beforeEach(() => {
    commands = new CommandRegistry();
    shell = { currentWidget: null };
    app = { commands, shell } as unknown as JupyterFrontEnd;
  });

  async function activatePlugin(
    settingRegistry: ISettingRegistry | null = null
  ): Promise<void> {
    await plugin.activate(app, nullTranslator, settingRegistry);
  }

  function createMainAreaWidget(): {
    toolbar: Toolbar<Widget>;
    widget: MainAreaWidget;
  } {
    const toolbar = new Toolbar<Widget>();
    toolbar.addItem('item', new Widget());
    const widget = new MainAreaWidget({
      content: new Widget(),
      toolbar
    });

    return { toolbar, widget };
  }

  function createSettingsRegistry(initialVisible: boolean): {
    registry: ISettingRegistry;
    set: jest.Mock<Promise<void>, [string, boolean]>;
    setVisible: (visible: boolean) => void;
  } {
    let visible = initialVisible;
    const changed = new Signal<ISettingRegistry.ISettings, void>(
      {} as ISettingRegistry.ISettings
    );
    const set = jest.fn(async (key: string, value: boolean): Promise<void> => {
      if (key === 'visible') {
        visible = value;
      }
    });
    const settings = {
      changed,
      get: (key: string) => ({
        composite: key === 'visible' ? visible : undefined
      }),
      set
    } as unknown as ISettingRegistry.ISettings;
    const registry = {
      load: jest.fn(async () => settings)
    } as unknown as ISettingRegistry;

    return {
      registry,
      set,
      setVisible: (value: boolean): void => {
        visible = value;
        changed.emit(undefined);
      }
    };
  }

  it('is disabled without a current main area widget', async () => {
    await activatePlugin();

    expect(commands.isEnabled(command)).toBe(false);
    expect(commands.isToggled(command)).toBe(false);
  });

  it('is enabled for a current main area widget', async () => {
    shell.currentWidget = new MainAreaWidget({ content: new Widget() });

    await activatePlugin();

    expect(commands.isEnabled(command)).toBe(true);
  });

  it('toggles the current main area widget toolbar', async () => {
    const { toolbar, widget } = createMainAreaWidget();
    shell.currentWidget = widget;

    await activatePlugin();

    expect(commands.isEnabled(command)).toBe(true);
    expect(commands.isToggled(command)).toBe(true);

    await commands.execute(command);

    expect(toolbar.isHidden).toBe(true);
    expect(commands.isToggled(command)).toBe(false);

    await commands.execute(command);

    expect(toolbar.isHidden).toBe(false);
    expect(commands.isToggled(command)).toBe(true);
  });

  it('stores toolbar visibility when toggled', async () => {
    const { registry, set } = createSettingsRegistry(true);
    const { toolbar, widget } = createMainAreaWidget();
    shell.currentWidget = widget;

    await activatePlugin(registry);
    await commands.execute(command);

    expect(toolbar.isHidden).toBe(true);
    expect(set).toHaveBeenCalledWith('visible', false);
  });

  it('applies persisted hidden state on activation', async () => {
    const { registry } = createSettingsRegistry(false);
    const { toolbar, widget } = createMainAreaWidget();
    shell.currentWidget = widget;

    await activatePlugin(registry);

    expect(toolbar.isHidden).toBe(true);
    expect(commands.isToggled(command)).toBe(false);
  });

  it('applies setting changes to the current toolbar', async () => {
    const { registry, setVisible } = createSettingsRegistry(true);
    const { toolbar, widget } = createMainAreaWidget();
    shell.currentWidget = widget;

    await activatePlugin(registry);
    expect(toolbar.isHidden).toBe(false);

    setVisible(false);

    expect(toolbar.isHidden).toBe(true);
  });
});
