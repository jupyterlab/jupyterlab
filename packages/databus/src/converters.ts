/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@phosphor/coreutils';
import { DisposableDelegate, IDisposable } from '@phosphor/disposable';
import { ISignal, Signal } from '@phosphor/signaling';
import { Dataset } from './dataregistry';
import { reachable, expandPath } from './graph';

export type Convert<T, V> = (data: T) => Promise<V>;
export type Converts<T, V> = Map<string, Convert<T, V>>;
/**
 * Function that can possibly convert between data type T to
 * data type V.
 *
 * It determines if it is able to convert T, based on it's mimetype
 * and returns a mapping of possible resulting mimetypes and
 * a function to compute their data.
 */
export type Converter<T, V> = (mimeType: string, url: URL) => Converts<T, V>;

function combineConverters<T, U>(
  a: Converter<T, U>,
  b: Converter<T, U>
): Converter<T, U> {
  return (mimeType: string, url: URL) => {
    return new Map<string, Convert<T, U>>([
      ...a(mimeType, url),
      ...b(mimeType, url)
    ]);
  };
}

function combineManyConverters<T, V>(
  converters: Iterable<Converter<T, V>>
): Converter<T, V> {
  return [...converters].reduce(combineConverters, () => new Map());
}

export function singleConverter<T, V>(
  fn: (mimeType: string, url: URL) => null | [string, Convert<T, V>]
): Converter<T, V> {
  return (mimeType: string, url: URL) => {
    const possibleResult = fn(mimeType, url);
    if (possibleResult === null) {
      return new Map();
    }
    return new Map([possibleResult]);
  };
}

export interface ISeperateConverterOptions<T, V> {
  /**
   * Computes the target mime type, given some source mimetype. If the convert is unable to
   * convert this mimetype, it should return `null`.
   */
  computeMimeType: (mimeType: string) => string | null;

  /**
   * The conversion function.
   */
  convert: Convert<T, V>;
}

/**
 * Create a convert by specifying seperate functions to compute the mimetype
 * and convert the data.
 */
export function seperateConverter<T, V>({
  computeMimeType,
  convert
}: ISeperateConverterOptions<T, V>): Converter<T, V> {
  return singleConverter((mimeType: string) => {
    const targetMimeType = computeMimeType(mimeType);
    if (targetMimeType == null) {
      return null;
    }
    return [targetMimeType, convert];
  });
}

export interface IStaticConverterOptions<T, V> {
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
   */
  convert: Convert<T, V>;
}

export function staticConverter<T, V>({
  sourceMimeType,
  targetMimeType,
  convert
}: IStaticConverterOptions<T, V>): Converter<T, V> {
  return seperateConverter({
    computeMimeType: (mimeType: string) => {
      if (mimeType === sourceMimeType) {
        return targetMimeType;
      }
      return null;
    },
    convert
  });
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
  register(converter: Converter<any, any>): IDisposable {
    this._converters.add(converter);

    this._convertersChanged.emit({ converter, type: 'added' });

    return new DisposableDelegate(() => {
      this._converters.delete(converter);
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
   * Converts a dataset to a new mimetype.
   *
   * Takes in a set of datasets that
   * Returns a an asyncronous iterator of the dataset(s) to get from the initial
   * dataset to the target.
   */
  async *convert(
    sourceDatasets: Iterable<Dataset<unknown>>,
    targetMimeType: string
  ): AsyncIterableIterator<Dataset<unknown>> {
    let singleURL: URL | null = null;
    const datas: Map<string, unknown> = new Map();
    for (const { url, mimeType, data } of sourceDatasets) {
      if (singleURL === null) {
        singleURL = url;
      } else {
        if (url.toString() !== singleURL.toString()) {
          throw new Error(
            `Datasets with different URLs were passed into convert: ${url} ${singleURL} `
          );
        }
      }
      datas.set(mimeType, data);
    }
    if (singleURL === null) {
      throw new Error(`No datasets passed in for ${targetMimeType}`);
    }
    const reachable = this._reachable(singleURL, datas.keys());
    if (!reachable.has(targetMimeType)) {
      throw new Error(
        `Cannot get from ${[
          ...reachable.keys()
        ]} to ${targetMimeType} for URL ${singleURL}`
      );
    }
    for (const [initialMimeType, convert, resultMimeType] of expandPath(
      targetMimeType,
      reachable.get(targetMimeType)!
    )) {
      // First part of path only has result
      if (!initialMimeType || !convert) {
        yield [...sourceDatasets].find(
          dataset => dataset.mimeType === resultMimeType
        )!;
        continue;
      }
      const data = await convert(datas.get(initialMimeType));
      datas.set(resultMimeType, data);
      yield new Dataset(resultMimeType, singleURL, data);
    }
  }

  /**
   * List the available target mime types for input mime types and URL.
   *
   * @param url - the input URL
   *
   * @param sourceMimeType - the input mime types.
   *
   * @returns An `Set<string>` of the available target mime types.
   */
  listTargetMimeTypes(
    url: URL,
    sourceMimeTypes: Iterable<string>
  ): Set<string> {
    return new Set(this._reachable(url, sourceMimeTypes).keys());
  }

  /**
   * Returns a mapping of mimetypes to the path to get to them,
   * of the new mimetype and the function converting the data.
   * @param mimeType Mimetype to start at.
   */
  private _reachable(
    url: URL,
    mimeTypes: Iterable<string>
  ): Map<string, Iterable<[string, Convert<unknown, unknown>]>> {
    const converter = combineManyConverters(this._converters);
    return reachable(mimeType => converter(mimeType, url), new Set(mimeTypes));
  }

  private _converters: Set<Converter<unknown, unknown>> = new Set();
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
    readonly converter: Converter<unknown, unknown>;

    /**
     * The type of change.
     */
    readonly type: 'added' | 'removed';
  }
}

/* tslint:disable */
export const IConverterRegistry = new Token<IConverterRegistry>(
  '@jupyterlab/databus:IConverterRegistry'
);

export interface IConverterRegistry extends ConverterRegistry {}
