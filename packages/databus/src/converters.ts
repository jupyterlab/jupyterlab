/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { DisposableDelegate, IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

import { IDataset } from './dataregistry';

/**
 * An interface for a converter between data of two mime types.
 */
export interface IConverter<A extends IDataset<any>, B extends IDataset<any>> {
  /**
   * The input mime type of the data of type `A` to be converted.
   */
  sourceMimeType: string;

  /**
   * The output mime type of the converted data of type `B`.
   */
  targetMimeType: string;

  /**
   * The conversion function.
   *
   * #### Notes
   * This takes an input `A` and converts it to a promise of
   * an `B`.
   */
  converter: (input: A) => Promise<B>;
}

/**
 * A registry for data converters.
 *
 * Questions:
 *
 * - Should we allow multiple converters between two mime types? If so, how do
 *   we decide which to use?
 * - Do we walk to graph to find chains of converters betweeen the source and target?
 */
export class ConverterRegistry {
  /**
   * Register a dataset converter
   *
   * @param converter - the `IConverter` to register.
   *
   * @returns A disposable which will remove the converter from the registry.
   *
   * @throws An error if the converter is already registered.
   */
  register(converter: IConverter<any, any>): IDisposable {
    let source = converter.sourceMimeType;
    let converters: Set<IConverter<any, any>>;
    if (this._converters.has(source)) {
      converters = this._converters.get(source);
    } else {
      converters = new Set();
      this._converters.set(source, converters);
    }
    converters.add(converter);

    this._convertersChanged.emit({ converter, type: 'added' });

    return new DisposableDelegate(() => {
      converters.delete(converter);
      this._convertersChanged.emit({ converter, type: 'removed' });
    });
  }

  /**
   * A signal that will fire when converters are registered or removed.
   */
  get convertersChanged(): ISignal<
    this,
    ConverterRegistry.IConvertersChangedArgs
  > {
    return this._convertersChanged;
  }

  /**
   * Convert an `IDataset<A>` to an `IDataset<B>`.
   *
   * @param sourceDataset - the input dataset.
   *
   * @param targetMimeType - the desired mimeType of the output dataset.
   *
   * @returns A promise that resolves to the converted dataset with the target mime
   *          type and type `IDataset<B>`.
   */
  convert<A extends IDataset<any>, B extends IDataset<any>>(
    sourceDataset: A,
    targetMimeType: string
  ): Promise<B> {
    let converter: IConverter<A, B> = this._resolveConverter(
      sourceDataset.mimeType,
      targetMimeType
    );
    return converter.converter(sourceDataset);
  }

  /**
   * List the available target mime types for an input mime type.
   *
   * @param sourceMimeType - the input mime type.
   *
   * @returns An `Set<string>` of the available target mime types.
   */
  listTargetMimeTypes(sourceMimeType: string): Set<string> {
    let converters: Set<IConverter<any, any>> = this._converters.get(
      sourceMimeType
    );
    if (converters === undefined) {
      return new Set();
    }
    return new Set([...converters].map(value => value.targetMimeType));
  }

  /**
   * Lookup a converter between source and target mime types.
   *
   * @param sourceMimeType - the mime type of the input dataset.
   *
   * @param targetMimeType - the mime type of the converted output dataset.
   *
   * @returns The `IConverter<A.B>` capable of doing the conversion or undefined.
   *
   * #### Notes
   * This does not currently traverse the directed graph of converters to identify chains of
   * converters that match.
   */
  private _resolveConverter<A extends IDataset<any>, B extends IDataset<any>>(
    sourceMimeType: string,
    targetMimeType: string
  ): IConverter<A, B> {
    let converters: Set<IConverter<any, any>> = this._converters.get(
      sourceMimeType
    );
    if (converters === undefined) {
      return undefined;
    }
    for (const converter of converters) {
      if (converter.targetMimeType === targetMimeType) {
        return converter;
      }
    }
  }

  private _converters: Map<string, Set<IConverter<any, any>>> = new Map();
  private _convertersChanged = new Signal<
    this,
    ConverterRegistry.IConvertersChangedArgs
  >(this);
}

/**
 * A public namespace for the converter registry.
 */
export namespace ConverterRegistry {
  /**
   * An interface for the changed args of the converters changed signal.
   */
  export interface IConvertersChangedArgs {
    /**
     * The converter begin added or removed.
     */
    readonly converter: IConverter<any, any>;

    /**
     * The type of change.
     */
    readonly type: 'added' | 'removed';
  }
}
