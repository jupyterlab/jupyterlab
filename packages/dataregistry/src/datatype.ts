/**
 * Typed datasets allow us to associate mimetypes with different types of the
 * the underlying data and parameters set in the mimetype.
 *
 * The use case is to be able to create converters in a type safe manner.
 */

import {
  Converter,
  Convert,
  Converts,
  SingleConvert,
  singleConverter,
  MimeType_
} from './converters';

export const INVALID = Symbol('INVALID');

export abstract class DataType<T, U> {
  abstract parseMimeType(mimeType: MimeType_): T | typeof INVALID;
  abstract createMimeType(typeData: T): MimeType_;

  /**
   * Creates a converter with a source of this data type.
   *
   * Your converter functions gets passed the type data associated
   * with this data type.
   */
  createConverter<V>(
    converter: (typeData: T, url: URL) => Converts<U, V>
  ): Converter<U, V> {
    return (mimeType: MimeType_, url: URL) => {
      const typeData = this.parseMimeType(mimeType);
      if (typeData === INVALID) {
        return new Map();
      }
      return converter(typeData, url);
    };
  }

  createSingleConverter<V>(
    converter: (typeData: T, url: URL) => SingleConvert<U, V>
  ): Converter<U, V> {
    return singleConverter((mimeType: MimeType_, url: URL) => {
      const typeData = this.parseMimeType(mimeType);
      if (typeData === INVALID) {
        return null;
      }
      return converter(typeData, url);
    });
  }

  createTypedConverter<V, X>(
    dest: DataType<V, X>,
    converter: (typeData: T, url: URL) => Map<V, Convert<U, X>>
  ): Converter<U, X> {
    return this.createConverter((typeData: T, url: URL) => {
      const res: Converts<U, X> = new Map();
      for (const [resTypeData, convert] of converter(typeData, url)) {
        res.set(dest.createMimeType(resTypeData), convert);
      }
      return res;
    });
  }
  createSingleTypedConverter<V, X>(
    dest: DataType<V, X>,
    converter: (typeData: T, url: URL) => null | [V, Convert<U, X>]
  ): Converter<U, X> {
    return this.createSingleConverter((typeData: T, url: URL) => {
      const newConverter = converter(typeData, url);
      if (newConverter === null) {
        return null;
      }
      const [resTypeData, convert] = newConverter;
      return [dest.createMimeType(resTypeData), convert];
    });
  }
}

export class DataTypeNoArgs<T> extends DataType<void, T> {
  constructor(public mimeType: MimeType_) {
    super();
  }
  parseMimeType(mimeType: MimeType_): void | typeof INVALID {
    if (mimeType !== this.mimeType) {
      return INVALID;
    }
  }
  createMimeType(_typeData: void): MimeType_ {
    return this.mimeType;
  }
}

/**
 * Data type with one arg in it's mimetype in form:
 * `{baseMimeType}; {paramaterKey}=<parameterValue>}`
 */
export class DataTypeStringArg<T> extends DataType<string, T> {
  constructor(baseMimeType: string, parameterKey: string) {
    super();
    this._base = `${baseMimeType}; ${parameterKey}=`;
  }
  parseMimeType(mimeType: MimeType_): string | typeof INVALID {
    if (!mimeType.startsWith(this._base)) {
      return INVALID;
    }
    return mimeType.slice(this._base.length);
  }
  createMimeType(typeData: string): MimeType_ {
    return `${this._base}${typeData}`;
  }

  private _base: string;
}
