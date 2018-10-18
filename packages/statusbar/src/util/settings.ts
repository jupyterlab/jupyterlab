import { ISignal, Signal } from '@phosphor/signaling';
import { IDisposable } from '@phosphor/disposable';
import { ISettingRegistry } from '@jupyterlab/coreutils';
import { JSONValue } from '@phosphor/coreutils';

export class SettingsConnector<I extends JSONValue> implements IDisposable {
  constructor(opts: SettingsConnector.IOptions) {
    this._registry = opts.registry;
    this._pluginId = opts.pluginId;
    this._settingKey = opts.settingKey;

    this._registry
      .load(this._pluginId)
      .then(settings => {
        this._settings = settings;
        settings.changed.connect(this._onSettingsUpdated);

        this._onSettingsUpdated(settings);
      })
      .catch((reason: Error) => {
        console.error(reason.message);
      });
  }

  get pluginId() {
    return this._pluginId;
  }

  get registry() {
    return this._registry;
  }

  get changed(): ISignal<this, SettingsConnector.IChangedArgs<I>> {
    return this._changed;
  }

  get currentValue() {
    return this._value;
  }

  set currentValue(value: I | null) {
    if (this._settings) {
      this._settings.set(this._settingKey, value as JSONValue);
    }
  }

  get isDisposed() {
    return this._isDisposed;
  }

  private _onSettingsUpdated = (settings: ISettingRegistry.ISettings) => {
    let rawSetting = settings.get(this._settingKey).composite as I | null;

    if (rawSetting === null) {
      rawSetting = settings.default(this._settingKey) as I;
    }

    const oldValue = this._value;
    this._value = rawSetting;
    this._changed.emit({
      newValue: this._value,
      oldValue
    });
  };

  dispose() {
    if (this.isDisposed) {
      return;
    }

    Signal.clearData(this);

    if (this._settings) {
      this._settings.changed.disconnect(this._onSettingsUpdated);
    }

    this._isDisposed = true;
  }

  private _isDisposed: boolean = false;
  private _changed: Signal<
    this,
    SettingsConnector.IChangedArgs<I>
  > = new Signal<this, SettingsConnector.IChangedArgs<I>>(this);

  private _registry: ISettingRegistry;
  private _settings: ISettingRegistry.ISettings | null = null;
  private _pluginId: string;
  private _settingKey: string;
  private _value: I | null = null;
}

export namespace SettingsConnector {
  export interface IOptions {
    registry: ISettingRegistry;
    pluginId: string;
    settingKey: string;
  }

  export interface IChangedArgs<I> {
    newValue: I | null;
    oldValue: I | null;
  }
}
