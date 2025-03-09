import { JSONArray } from '@lumino/coreutils';
import { IKeyboardLayout, KeycodeLayout } from '@lumino/keyboard';
import { ISignal, Signal } from '@lumino/signaling';
import { IKeyboardLayoutRegistry, IKeyboardLayoutSettings } from './types';

export class KeyboardLayoutRegistry implements IKeyboardLayoutRegistry {
  /**
   *
   */
  constructor(fixed: IKeyboardLayout[]) {
    for (const layout of fixed) {
      this._fixedData.set(layout.name, layout);
    }
  }

  get(name: string): IKeyboardLayout | undefined {
    if (this._data.has(name)) {
      if (this._cache.has(name)) {
        return this._cache.get(name);
      }
      const { codeMap, modifiers } = this._data.get(name)!;
      const layout = new KeycodeLayout(name, {}, [...modifiers], codeMap);
      this._cache.set(name, layout);
      return layout;
    }
    return this._fixedData.get(name);
  }

  getRaw(name: string): IKeyboardLayoutSettings | undefined {
    return this._data.get(name);
  }

  add(layout: IKeyboardLayoutSettings): void {
    this._data.set(layout.name, layout);
    this._cache.delete(layout.name);
    this._changed.emit(undefined);
  }

  remove(name: string): void {
    this._data.delete(name);
    this._cache.delete(name);
    this._changed.emit(undefined);
  }

  serialize(): JSONArray {
    return [...this._data.values()].map(layout => ({ ...layout }));
  }

  set customLayouts(layouts: IKeyboardLayoutSettings[]) {
    this._data = new Map(layouts.map(layout => [layout.name, layout]));
    this._cache = new Map();
  }

  get names(): string[] {
    return [...new Set([...this._fixedData.keys(), ...this._data.keys()])];
  }

  get changed(): ISignal<unknown, unknown> {
    return this._changed;
  }

  private _changed = new Signal({});
  private _fixedData = new Map<string, IKeyboardLayout>();
  private _data = new Map<string, IKeyboardLayoutSettings>();
  private _cache = new Map<string, IKeyboardLayout>();
}
