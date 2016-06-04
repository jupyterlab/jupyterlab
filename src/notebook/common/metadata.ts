// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * A class used to interact with user level metadata.
 */
export
interface IMetadataCursor {
  /**
   * The metadata namespace.
   */
  name: string;

  /**
   * Get the value of the metadata.
   */
  getValue(): any;

  /**
   * Set the value of the metdata.
   */
  setValue(value: any): void;
}


/**
 * An implementation of a metadata cursor.
 */
export
class MetadataCursor implements IMetadataCursor {
  /**
   * Construct a new metadata cursor.
   *
   * @param name - The metadata namespace key.
   *
   * @param read - The read callback.
   *
   * @param write - The write callback.
   */
  constructor(name: string, read: () => any, write: (value: any) => void) {
    this._name = name;
    this._read = read;
    this._write = write;
  }

  /**
   * Get the namespace key of the metadata.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Dispose of the resources used by the cursor.
   *
   * #### Notes
   * This is not meant to be called by user code.
   */
  dispose(): void {
    this._read = null;
    this._write = null;
  }

  /**
   * Get the value of the namespace data.
   */
  getValue(): any {
    let read = this._read;
    return read();
  }

  /**
   * Set the value of the namespace data.
   */
  setValue(value: any): void {
    let write = this._write;
    write(value);
  }

  private _name = '';
  private _read: () => string = null;
  private _write: (value: string) => void = null;
}
