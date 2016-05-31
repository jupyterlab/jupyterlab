// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as utils
  from 'jupyter-js-utils';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

import {
  Widget
} from 'phosphor-widget';

import {
  IModelFactory, IWidgetFactory, IWidgetFactoryOptions,
  IFileType, IKernelPreference, IFileCreator, IWidgetExtension
} from './interfaces';


/**
 * The document registery.
 *
 * #### Notes
 * The document registry is used to register model and widget creators.
 */
export
class DocumentRegistry implements IDisposable {
  /**
   * The name of the default widget factory.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultWidgetFactory(): string {
    return this._defaultWidgetFactory;
  }

  /**
   * Get whether the document registry has been disposed.
   */
  get isDisposed(): boolean {
    return this._widgetFactories === null;
  }

  /**
   * Dispose of the resources held by the document registery.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    for (let modelName in this._modelFactories) {
      this._modelFactories[modelName].dispose();
    }
    this._modelFactories = null;
    for (let widgetName in this._widgetFactories) {
      this._widgetFactories[widgetName].factory.dispose();
    }
    this._widgetFactories = null;
  }

  /**
   * Register a widget factory with the document registry.
   *
   * @param factory - The factory instance.
   *
   * @param options - The options used to register the factory.
   *
   * @returns A disposable used to unregister the factory.
   *
   * #### Notes
   * If a factory with the given `displayName` is already registered,
   * an error will be thrown.
   * If `'.*'` is given as a default extension, the factory will be registered
   * as the global default.
   * If a factory is already registered as a default for a given extension or
   * as the global default, this factory will override the existing default.
   */
  registerWidgetFactory(factory: IWidgetFactory<Widget>, options: IWidgetFactoryOptions): IDisposable {
    let name = options.displayName;
    let exOpt = utils.copy(options) as Private.IWidgetFactoryEx;
    exOpt.factory = factory;
    if (this._widgetFactories[name]) {
      throw new Error(`Duplicate registered factory ${name}`);
    }
    this._widgetFactories[name] = exOpt;
    if (options.defaultFor) {
      for (let option of options.defaultFor) {
        if (option === '.*') {
          this._defaultWidgetFactory = name;
        } else if (options.fileExtensions.indexOf(option) !== -1) {
          this._defaultWidgetFactories[option] = name;
        }
      }
    }
    return new DisposableDelegate(() => {
      delete this._widgetFactories[name];
      if (this._defaultWidgetFactory === name) {
        this._defaultWidgetFactory = '';
      }
      for (let opt of Object.keys(this._defaultWidgetFactories)) {
        let n = this._defaultWidgetFactories[opt];
        if (n === name) {
          delete this._defaultWidgetFactories[opt];
        }
      }
    });
  }

  /**
   * Register a model factory.
   *
   * @param factory - The factory instance.
   *
   * @returns A disposable used to unregister the factory.
   *
   * #### Notes
   * If a factory with the given `name` is already registered, an error
   * will be thrown.
   */
  registerModelFactory(factory: IModelFactory): IDisposable {
    let name = factory.name;
    if (this._modelFactories[name]) {
      throw new Error(`Duplicate registered factory ${name}`);
    }
    this._modelFactories[name] = factory;
    return new DisposableDelegate(() => {
      delete this._modelFactories[name];
    });
  }

  /**
   * Register a widget extension.
   *
   * @param extension - A widget extension.
   *
   * @returns A disposable that can be used to unregister the extension.
   */
  registerExtension(widgetName: string, extension: IWidgetExtension<Widget>): IDisposable {
    if (!(widgetName in this._extenders)) {
      this._extenders[widgetName] = [];
    }
    this._extenders[widgetName].push(extension);
    return new DisposableDelegate(() => {
      let index = this._extenders[widgetName].indexOf(extension);
      this._extenders[widgetName].splice(index, 1);
    });
  }

  /**
   * Register a file type with the document registry.
   *
   * #### Notes
   * These are used to populate the "Create New" dialog.
   */
  registerFileType(fileType: IFileType): IDisposable {
    this._fileTypes.push(fileType);
    this._fileTypes.sort((a, b) => a.name.localeCompare(b.name));
    return new DisposableDelegate(() => {
      let index = this._fileTypes.indexOf(fileType);
      this._fileTypes.splice(index, 1);
    });
  }

  /**
   * Register a Create New handler.
   *
   * @params creator - The file creator object.
   *
   * @params after - The optional item name to insert after.
   *
   * #### Notes
   * If `after` is not given or not already registered, it will be moved
   * to the end.
   */
  registerCreator(creator: IFileCreator, after?: string): IDisposable {
    let added = false;
    if (after) {
      for (let existing of this._creators) {
        if (existing.name === after) {
          let index = this._creators.indexOf(existing);
          this._creators.splice(index, 0, creator);
          added = true;
        }
      }
    }
    if (!added) {
      this._creators.push(creator);
    }
    return new DisposableDelegate(() => {
      let index = this._creators.indexOf(creator);
      this._creators.splice(index, 1);
    });
  }

  /**
   * Get the list of registered widget factory display names.
   *
   * @param path - An optional file path to filter the results.
   *
   * #### Notes
   * The first item in the list is considered the default.
   */
  listWidgetFactories(ext?: string): string[] {
    ext = ext || '';
    let factories: string[] = [];
    let options: Private.IWidgetFactoryEx;
    let name = '';
    // If an extension was given, filter by extension.
    // Make sure the modelFactory is registered.
    if (ext.length > 1) {
      if (ext in this._defaultWidgetFactories) {
        name = this._defaultWidgetFactories[ext];
        options = this._widgetFactories[name];
        if (options.modelName in this._modelFactories) {
          factories.push(name);
        }
      }
    }
    // Add the rest of the valid widgetFactories that can open the path.
    for (name in this._widgetFactories) {
      if (factories.indexOf(name) !== -1) {
        continue;
      }
      options = this._widgetFactories[name];
      if (!(options.modelName in this._modelFactories)) {
        continue;
      }
      let exts = options.fileExtensions;
      if ((exts.indexOf(ext) !== -1) || (exts.indexOf('.*') !== -1)) {
        factories.push(name);
      }
    }
    // Add the default widget if it was not already added.
    name = this._defaultWidgetFactory;
    if (name && factories.indexOf(name) === -1) {
      options = this._widgetFactories[name];
      if (options.modelName in this._modelFactories) {
        factories.push(name);
      }
    }
    return factories;
  }

  /**
   * Get a list of file types that have been registered.
   */
  listFileTypes(): IFileType[] {
    return this._fileTypes.slice();
  }

  /**
   * Get the ordered list of file creator names.
   */
  listCreators(): IFileCreator[] {
    return this._creators.slice();
  }

  /**
   * Get the kernel preference.
   */
  getKernelPreference(ext: string, widgetName: string): IKernelPreference {
    let widgetFactoryEx = this._getWidgetFactoryEx(widgetName);
    let modelFactory = this.getModelFactory(widgetName);
    let language = modelFactory.preferredLanguage(ext);
    return {
      language,
      preferKernel: widgetFactoryEx.preferKernel,
      canStartKernel: widgetFactoryEx.canStartKernel
    };
  }

  /**
   * Get the model factory registered for a given widget factory.
   *
   */
  getModelFactory(widgetName: string): IModelFactory {
    let wFactoryEx = this._getWidgetFactoryEx(widgetName);
    if (!wFactoryEx) {
      return;
    }
    return this._modelFactories[wFactoryEx.modelName];
  }

  /**
   * Get a widget factory by name.
   */
  getWidgetFactory(widgetName: string): IWidgetFactory<Widget> {
    return this._getWidgetFactoryEx(widgetName).factory;
  }

  /**
   * Get the registered extensions for a given widget.
   */
  getWidgetExtensions(widgetName: string): IWidgetExtension<Widget>[] {
    if (!(widgetName in this._extenders)) {
      return [];
    }
    return this._extenders[widgetName].slice();
  }

  /**
   * Get the appropriate widget factory by name.
   */
  private _getWidgetFactoryEx(widgetName: string): Private.IWidgetFactoryEx {
    let options: Private.IWidgetFactoryEx;
    if (widgetName === 'default') {
      options = this._widgetFactories[this._defaultWidgetFactory];
    } else {
      options = this._widgetFactories[widgetName];
    }
    return options;
  }

  private _modelFactories: { [key: string]: IModelFactory } = Object.create(null);
  private _widgetFactories: { [key: string]: Private.IWidgetFactoryEx } = Object.create(null);
  private _defaultWidgetFactory = '';
  private _defaultWidgetFactories: { [key: string]: string } = Object.create(null);
  private _fileTypes: IFileType[] = [];
  private _creators: IFileCreator[] = [];
  private _extenders: { [key: string] : IWidgetExtension<Widget>[] } = Object.create(null);
}


/**
 * A private namespace for DocumentRegistry data.
 */
namespace Private {
  /**
   * An extended interface for a widget factory and its options.
   */
  export
  interface IWidgetFactoryEx extends IWidgetFactoryOptions {
    factory: IWidgetFactory<Widget>;
  }
}
