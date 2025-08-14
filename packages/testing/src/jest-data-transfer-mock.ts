/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

interface IFileSystemEntryOptions {
  name: string;
}

export interface IFileSystemFileEntryOptions extends IFileSystemEntryOptions {
  file: {
    bits: string[];
  };
}

export interface IFileSystemDirectoryEntryOptions
  extends IFileSystemEntryOptions {
  files: (IFileSystemDirectoryEntryOptions | IFileSystemFileEntryOptions)[];
}

class FileSystemEntryMock implements FileSystemEntry {
  readonly isFile: boolean = false;
  readonly isDirectory: boolean = false;
  readonly name: string;

  constructor(options: IFileSystemEntryOptions) {
    this.name = options.name;
  }
  getParent() {
    throw Error('Not implemented in the mock');
  }
  get filesystem(): FileSystem {
    throw Error('Not implemented in the mock');
  }
  get fullPath(): string {
    throw Error('Not implemented in the mock');
  }
}

class FileSystemDirectoryEntryMock
  extends FileSystemEntryMock
  implements FileSystemDirectoryEntry
{
  readonly isFile = false;
  readonly isDirectory = true;
  constructor(options: IFileSystemDirectoryEntryOptions) {
    super(options);
    this._files = options.files.map(spec =>
      'file' in spec
        ? new FileSystemFileEntryMock(spec)
        : new FileSystemDirectoryEntryMock(spec)
    );
  }
  createReader(): FileSystemDirectoryReader {
    return new FileSystemDirectoryReaderMock(this._files);
  }
  getDirectory() {
    throw Error('Not implemented in the mock');
  }
  getFile() {
    throw Error('Not implemented in the mock');
  }
  private _files: (FileSystemFileEntry | FileSystemDirectoryEntry)[];
}

class FileSystemFileEntryMock
  extends FileSystemEntryMock
  implements FileSystemFileEntry
{
  readonly isFile = true;
  readonly isDirectory = false;
  constructor(options: IFileSystemFileEntryOptions) {
    super(options);
    this._file = new File(options.file.bits, options.name);
  }
  file(successCallback: (file: File) => void) {
    successCallback(this._file);
  }
  private _file: File;
}

class FileSystemDirectoryReaderMock implements FileSystemDirectoryReader {
  constructor(
    private _files: (FileSystemFileEntry | FileSystemDirectoryEntry)[]
  ) {
    this._index = 0;
  }
  readEntries(successCallback: FileSystemEntriesCallback) {
    successCallback(
      this._files.slice(
        this._index,
        Math.min(this._files.length, this._index + this._step)
      )
    );
    this._index += this._step;
  }
  private _index: number;
  private _step = 2;
}

// https://github.com/jsdom/jsdom/issues/2913
class DataTransferItemMock implements DataTransferItem {
  readonly kind: string;
  constructor(
    public type: string,
    protected value: string
  ) {
    this.kind = ['file', 'directory'].includes(type) ? type : 'string';
  }
  getAsString(callback: (v: string) => undefined): undefined {
    callback(this.value);
  }
  getAsFile() {
    return null;
  }
  webkitGetAsEntry() {
    if (this.kind === 'directory') {
      return new FileSystemDirectoryEntryMock(JSON.parse(this.value));
    } else if (this.kind === 'file') {
      return new FileSystemFileEntryMock(JSON.parse(this.value));
    }
    return null;
  }
}

// https://github.com/jsdom/jsdom/issues/2913
export class DataTransferMock implements DataTransfer {
  dropEffect: DataTransfer['dropEffect'] = 'none';
  effectAllowed: DataTransfer['dropEffect'] = 'none';
  files: DataTransfer['files'];
  get items(): DataTransfer['items'] {
    return [
      ...Object.entries(this._data).map(
        ([k, v]) => new DataTransferItemMock(k, v)
      )
    ] as unknown as DataTransferItemList;
  }
  readonly types: DataTransfer['types'] = [];
  getData(format: string) {
    return this._data[format];
  }
  setData(format: string, data: string) {
    this._data[format] = data;
  }
  clearData() {
    this._data = {};
  }
  setDragImage(imgElement: Element, xOffset: number, yOffset: number) {
    // no-op
  }
  private _data: Record<string, string> = {};
}
