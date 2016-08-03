// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable, DisposableDelegate
} from 'phosphor/lib/core/disposable';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  IModelFactory, IWidgetFactory, IWidgetFactoryOptions,
  IFileType, IKernelPreference, IFileCreator, IWidgetExtension,
  IDocumentModel
} from './interfaces';


/* tslint:disable */
/**
 * The document registry token.
 */
export
const IDocumentRegistry = new Token<IDocumentRegistry>('jupyter.services.document-registry');
/* tslint:enable */


/**
 * An interface for document registries.
 */
export
interface IDocumentRegistry extends IDisposable {
  /**
   * Add a widget factory to the registry.
   *
   * @param factory - The factory instance to register.
   *
   * @param options - The options used to register the factory.
   *
   * @returns A disposable which will unregister the factory.
   *
   * #### Notes
   * If a factory with the given `'displayName'` is already registered,
   * a warning will be logged, and this will be a no-op.
   * If `'*'` is given as a default extension, the factory will be registered
   * as the global default.
   * If an extension or global default is already registered, this factory
   * will override the existing default.
   */
  addWidgetFactory(factory: IWidgetFactory<Widget, IDocumentModel>, options: IWidgetFactoryOptions): IDisposable;

  /**
   * Add a model factory to the registry.
   *
   * @param factory - The factory instance.
   *
   * @returns A disposable which will unregister the factory.
   *
   * #### Notes
   * If a factory with the given `name` is already registered, or
   * the given factory is already registered, a warning will be logged
   * and this will be a no-op.
   */
  addModelFactory(factory: IModelFactory): IDisposable;

  /**
   * Add a widget extension to the registry.
   *
   * @param widgetName - The name of the widget factory.
   *
   * @param extension - A widget extension.
   *
   * @returns A disposable which will unregister the extension.
   *
   * #### Notes
   * If the extension is already registered for the given
   * widget name, a warning will be logged and this will be a no-op.
   */
  addWidgetExtension(widgetName: string, extension: IWidgetExtension<Widget, IDocumentModel>): IDisposable;

  /**
   * Add a file type to the document registry.
   *
   * @params fileType - The file type object to register.
   *
   * @returns A disposable which will unregister the command.
   *
   * #### Notes
   * These are used to populate the "Create New" dialog.
   * If the file type with the same name is already registered, a warning will
   * be logged and this will be a no-op.
   */
  addFileType(fileType: IFileType): IDisposable;

  /**
   * Add a creator to the registry.
   *
   * @params creator - The file creator object to register.
   *
   * @params after - The optional item name to insert after.
   *
   * @returns A disposable which will unregister the creator.
   *
   * #### Notes
   * If a creator of the same name is already registered,
   * a warning will be logged and this will be a no-op.
   * If `after` is not given or not already registered, it will be moved
   * to the end.
   */
  addCreator(creator: IFileCreator, after?: string): IDisposable;

  /**
   * List the names of the valid registered widget factories.
   *
   * @param ext - An optional file extension to filter the results.
   *
   * @returns A new array of registered widget factory names.
   *
   * #### Notes
   * Only the widget factories whose associated model factory have
   * been registered will be returned.
   * The first item in the list is considered the default. The returned list
   * has widget factories in the following order:
   * - extension-specific default factory
   * - global default factory
   * - all other extension-specific factories
   * - all other global factories
   */
  listWidgetFactories(ext: string = '*'): string[];

  /**
   * Return the name of the default widget factory for a given extension.
   *
   * @param ext - An optional file extension.
   *
   * @returns The default widget factory name for the extension (if given) or the global default.
   */
  defaultWidgetFactory(ext: string = '*'): string;

  /**
   * List the names of the registered model factories.
   *
   * @returns A new array of registered model factory names.
   */
  listModelFactories(): string[];

  /**
   * Get a list of file types that have been registered.
   *
   * @returns A new array of registered file type objects.
   */
  listFileTypes(): IFileType[];

  /**
   * Get an ordered list of the file creators that have been registered.
   *
   * @returns A new array of registered file creator objects.
   */
  listCreators(): IFileCreator[];

  /**
   * Get a file type by name.
   */
  getFileType(name: string): IFileType;

  /**
   * Get a creator by name.
   */
  getCreator(name: string): IFileCreator;

  /**
   * Get a kernel preference.
   *
   * @param ext - The file extension.
   *
   * @param widgetName - The name of the widget factory.
   *
   * @returns A kernel preference.
   */
  getKernelPreference(ext: string, widgetName: string): IKernelPreference;

  /**
   * Get the model factory registered for a given widget factory.
   *
   * @param widgetName - The name of the widget factory.
   *
   * @returns A model factory instance.
   */
  getModelFactoryFor(widgetName: string): IModelFactory;

  /**
   * Get a widget factory by name.
   *
   * @param widgetName - The name of the widget factory.
   *
   * @returns A widget factory instance.
   */
  getWidgetFactory(widgetName: string): IWidgetFactory<Widget, IDocumentModel>;

  /**
   * Get the registered extensions for a given widget.
   *
   * @param widgetName - The name of the widget factory.
   *
   * @returns A new array of widget extensions.
   */
  getWidgetExtensions(widgetName: string): IWidgetExtension<Widget, IDocumentModel>[];
}


/**
 * The document registry.
 */
export
class DocumentRegistry implements IDocumentRegistry {
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
    this._fileTypes = null;
    this._creators = null;
    this._extenders = null;
  }

  /**
   * Add a widget factory to the registry.
   *
   * @param factory - The factory instance to register.
   *
   * @param options - The options used to register the factory.
   *
   * @returns A disposable which will unregister the factory.
   *
   * #### Notes
   * If a factory with the given `'displayName'` is already registered,
   * a warning will be logged, and this will be a no-op.
   * If `'*'` is given as a default extension, the factory will be registered
   * as the global default.
   * If an extension or global default is already registered, this factory
   * will override the existing default.
   */
  addWidgetFactory(factory: IWidgetFactory<Widget, IDocumentModel>, options: IWidgetFactoryOptions): IDisposable {
    let name = options.displayName.toLowerCase();
    if (this._widgetFactories[name]) {
      console.warn(`Duplicate registered factory ${name}`);
      return new DisposableDelegate(null);
    }
    let record = Private.createRecord(factory, options);
    this._widgetFactories[name] = record;
    for (let ext of record.defaultFor) {
      if (record.fileExtensions.indexOf(ext) === -1) {
        continue;
      }
      if (ext === '*') {
        this._defaultWidgetFactory = name;
      } else {
        this._defaultWidgetFactories[ext] = name;
      }
    }
    // For convenience, store a mapping of ext -> name
    for (let ext of record.fileExtensions) {
      if (!this._widgetFactoryExtensions[ext]) {
        this._widgetFactoryExtensions[ext] = new Set<string>();
      }
      this._widgetFactoryExtensions[ext].add(name);
    }
    return new DisposableDelegate(() => {
      delete this._widgetFactories[name];
      if (this._defaultWidgetFactory === name) {
        this._defaultWidgetFactory = '';
      }
      for (let ext of Object.keys(this._defaultWidgetFactories)) {
        if (this._defaultWidgetFactories[ext] === name) {
          delete this._defaultWidgetFactories[ext];
        }
      }
      for (let ext of Object.keys(this._widgetFactoryExtensions)) {
        this._widgetFactoryExtensions[ext].delete(name);
        if (this._widgetFactoryExtensions[ext].size === 0) {
          delete this._widgetFactoryExtensions[ext];
        }
      }
    });
  }

  /**
   * Add a model factory to the registry.
   *
   * @param factory - The factory instance.
   *
   * @returns A disposable which will unregister the factory.
   *
   * #### Notes
   * If a factory with the given `name` is already registered, or
   * the given factory is already registered, a warning will be logged
   * and this will be a no-op.
   */
  addModelFactory(factory: IModelFactory): IDisposable {
    let name = factory.name.toLowerCase();
    if (this._modelFactories[name]) {
      console.warn(`Duplicate registered factory ${name}`);
      return new DisposableDelegate(null);
    }
    this._modelFactories[name] = factory;
    return new DisposableDelegate(() => {
      delete this._modelFactories[name];
    });
  }

  /**
   * Add a widget extension to the registry.
   *
   * @param widgetName - The name of the widget factory.
   *
   * @param extension - A widget extension.
   *
   * @returns A disposable which will unregister the extension.
   *
   * #### Notes
   * If the extension is already registered for the given
   * widget name, a warning will be logged and this will be a no-op.
   */
  addWidgetExtension(widgetName: string, extension: IWidgetExtension<Widget, IDocumentModel>): IDisposable {
    widgetName = widgetName.toLowerCase();
    if (!(widgetName in this._extenders)) {
      this._extenders[widgetName] = [];
    }
    let extenders = this._extenders[widgetName];
    let index = extenders.indexOf(extension);
    if (index !== -1) {
      console.warn(`Duplicate registered extension for ${widgetName}`);
      return new DisposableDelegate(null);
    }
    this._extenders[widgetName].push(extension);
    return new DisposableDelegate(() => {
      index = this._extenders[widgetName].indexOf(extension);
      this._extenders[widgetName].splice(index, 1);
    });
  }

  /**
   * Add a file type to the document registry.
   *
   * @params fileType - The file type object to register.
   *
   * @returns A disposable which will unregister the command.
   *
   * #### Notes
   * These are used to populate the "Create New" dialog.
   * If the file type with the same name is already registered, a warning will
   * be logged and this will be a no-op.
   */
  addFileType(fileType: IFileType): IDisposable {
    for (let fType of this._fileTypes) {
      if (fType.name.toLowerCase() === fileType.name.toLowerCase()) {
        console.warn(`Duplicate registered file types for ${fType.name}`);
        return new DisposableDelegate(null);
      }
    }
    fileType.extension = Private.normalizeExtension(fileType.extension);
    this._fileTypes.push(fileType);
    this._fileTypes.sort((a, b) => a.name.localeCompare(b.name));
    return new DisposableDelegate(() => {
      let index = this._fileTypes.indexOf(fileType);
      this._fileTypes.splice(index, 1);
    });
  }

  /**
   * Add a creator to the registry.
   *
   * @params creator - The file creator object to register.
   *
   * @params after - The optional item name to insert after.
   *
   * @returns A disposable which will unregister the creator.
   *
   * #### Notes
   * If a creator of the same name is already registered,
   * a warning will be logged and this will be a no-op.
   * If `after` is not given or not already registered, it will be moved
   * to the end.
   */
  addCreator(creator: IFileCreator, after?: string): IDisposable {
    for (let c of this._creators) {
      if (c.name.toLowerCase() === creator.name.toLowerCase()) {
        console.warn(`Duplicate registered file creator named ${creator.name}`);
        return new DisposableDelegate(null);
      }
    }
    let added = false;
    if (after) {
      for (let existing of this._creators) {
        if (existing.name.toLowerCase() === after.toLowerCase()) {
          let index = this._creators.indexOf(existing);
          this._creators.splice(index, 0, creator);
          added = true;
          break;
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
   * List the names of the valid registered widget factories.
   *
   * @param ext - An optional file extension to filter the results.
   *
   * @returns A new array of registered widget factory names.
   *
   * #### Notes
   * Only the widget factories whose associated model factory have
   * been registered will be returned.
   * The first item in the list is considered the default. The returned list
   * has widget factories in the following order:
   * - extension-specific default factory
   * - global default factory
   * - all other extension-specific factories
   * - all other global factories
   */
  listWidgetFactories(ext: string = '*'): string[] {
    let factories = new Set<string>();
    ext = Private.normalizeExtension(ext);

    // Start with the extension-specific default factory.
    if (ext.length > 1) {
      if (ext in this._defaultWidgetFactories) {
        factories.add(this._defaultWidgetFactories[ext]);
      }
    }

    // Add the global default factory.
    if (this._defaultWidgetFactory) {
      factories.add(this._defaultWidgetFactory);
    }

    // Add the extension-specific factories in registration order.
    if (ext.length > 1) {
      if (ext in this._widgetFactoryExtensions) {
        this._widgetFactoryExtensions[ext].forEach(n => { factories.add(n); });
      }
    }

    // Add the rest of the global factories, in registration order.
    if ('*' in this._widgetFactoryExtensions) {
      this._widgetFactoryExtensions['*'].forEach(n => { factories.add(n); });
    }

    // Construct the return list, checking to make sure the corresponding
    // model factories are registered.
    let factoryList: string[] = [];
    factories.forEach(name => {
      if (this._widgetFactories[name].modelName in this._modelFactories) {
        name = this._widgetFactories[name].displayName;
        factoryList.push(name);
      }
    });

    return factoryList;
  }

  /**
   * Return the name of the default widget factory for a given extension.
   *
   * @param ext - An optional file extension.
   *
   * @returns The default widget factory name for the extension (if given) or the global default.
   */
  defaultWidgetFactory(ext: string = '*'): string {
    let widgets = this.listWidgetFactories(ext);
    return widgets ? widgets[0] : void 0;
  }

  /**
   * List the names of the registered model factories.
   *
   * @returns A new array of registered model factory names.
   */
  listModelFactories(): string[] {
    return Object.keys(this._modelFactories);
  }

  /**
   * Get a list of file types that have been registered.
   *
   * @returns A new array of registered file type objects.
   */
  listFileTypes(): IFileType[] {
    return this._fileTypes.slice();
  }

  /**
   * Get an ordered list of the file creators that have been registered.
   *
   * @returns A new array of registered file creator objects.
   */
  listCreators(): IFileCreator[] {
    return this._creators.slice();
  }

  /**
   * Get a file type by name.
   */
  getFileType(name: string): IFileType {
    name = name.toLowerCase();
    for (let i = 0; i < this._fileTypes.length; i++) {
      let fileType = this._fileTypes[i];
      if (fileType.name === name) {
        return fileType;
      }
    }
  }

  /**
   * Get a creator by name.
   */
  getCreator(name: string): IFileCreator {
    name = name.toLowerCase();
    for (let i = 0; i < this._creators.length; i++) {
      let creator = this._creators[i];
      if (creator.name.toLowerCase() === name) {
        return creator;
      }
    }
  }

  /**
   * Get a kernel preference.
   *
   * @param ext - The file extension.
   *
   * @param widgetName - The name of the widget factory.
   *
   * @returns A kernel preference.
   */
  getKernelPreference(ext: string, widgetName: string): IKernelPreference {
    ext = Private.normalizeExtension(ext);
    widgetName = widgetName.toLowerCase();
    let widgetFactoryEx = this._getWidgetFactoryEx(widgetName);
    if (!widgetFactoryEx) {
      return void 0;
    }
    let modelFactory = this.getModelFactoryFor(widgetName);
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
   * @param widgetName - The name of the widget factory.
   *
   * @returns A model factory instance.
   */
  getModelFactoryFor(widgetName: string): IModelFactory {
    widgetName = widgetName.toLowerCase();
    let wFactoryEx = this._getWidgetFactoryEx(widgetName);
    if (!wFactoryEx) {
      return;
    }
    return this._modelFactories[wFactoryEx.modelName.toLowerCase()];
  }

  /**
   * Get a widget factory by name.
   *
   * @param widgetName - The name of the widget factory.
   *
   * @returns A widget factory instance.
   */
  getWidgetFactory(widgetName: string): IWidgetFactory<Widget, IDocumentModel> {
    widgetName = widgetName.toLowerCase();
    let ex = this._getWidgetFactoryEx(widgetName);
    return ex ? ex.factory : void 0;
  }

  /**
   * Get the registered extensions for a given widget.
   *
   * @param widgetName - The name of the widget factory.
   *
   * @returns A new array of widget extensions.
   */
  getWidgetExtensions(widgetName: string): IWidgetExtension<Widget, IDocumentModel>[] {
    widgetName = widgetName.toLowerCase();
    if (!(widgetName in this._extenders)) {
      return [];
    }
    return this._extenders[widgetName].slice();
  }

  /**
   * Get the appropriate widget factory by name.
   */
  private _getWidgetFactoryEx(widgetName: string): Private.IWidgetFactoryRecord {
    widgetName = widgetName.toLowerCase();
    let options: Private.IWidgetFactoryRecord;
    if (widgetName === 'default') {
      options = this._widgetFactories[this._defaultWidgetFactory];
    } else {
      options = this._widgetFactories[widgetName];
    }
    return options;
  }

  private _modelFactories: { [key: string]: IModelFactory } = Object.create(null);
  private _widgetFactories: { [key: string]: Private.IWidgetFactoryRecord } = Object.create(null);
  private _defaultWidgetFactory = '';
  private _defaultWidgetFactories: { [key: string]: string } = Object.create(null);
  private _widgetFactoryExtensions: {[key: string]: Set<string> } = Object.create(null);
  private _fileTypes: IFileType[] = [];
  private _creators: IFileCreator[] = [];
  private _extenders: { [key: string] : IWidgetExtension<Widget, IDocumentModel>[] } = Object.create(null);
}


/**
 * A private namespace for DocumentRegistry data.
 */
namespace Private {
  /**
   * A record for a widget factory and its options.
   */
  export
  interface IWidgetFactoryRecord extends IWidgetFactoryOptions {
    factory: IWidgetFactory<Widget, IDocumentModel>;
  }

  /**
   * Create a widget factory record.
   */
  export
  function createRecord(factory: IWidgetFactory<Widget, IDocumentModel>, options: IWidgetFactoryOptions): IWidgetFactoryRecord {
    let fileExtensions = options.fileExtensions.map(ext => normalizeExtension(ext));
    let defaultFor = options.defaultFor || [];
    defaultFor = defaultFor.map(ext => normalizeExtension(ext));
    return {
      factory,
      fileExtensions,
      defaultFor,
      displayName: options.displayName,
      modelName: options.modelName.toLowerCase(),
      preferKernel: !!options.preferKernel,
      canStartKernel: !!options.canStartKernel
    };
  }

  /**
   * Normalize a file extension to be of the type `'.foo'`.
   *
   * Adds a leading dot if not present and converts to lower case.
   */
  export
  function normalizeExtension(extension: string): string {
    if (extension === '*') {
      return extension;
    }
    if (extension === '.*') {
      return '*';
    }
    if (extension.indexOf('.') !== 0) {
      extension = `.${extension}`;
    }
    return extension.toLowerCase();
  }
}
