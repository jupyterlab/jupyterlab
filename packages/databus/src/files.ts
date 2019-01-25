import { IDataset } from './dataregistry';
import { IResolver } from './resolverregistry';

interface IFileDatasetOptions {
  url: string;
  path: string;
  mimeType: string;
}
export class FileDataset implements IDataset<string> {
  constructor({ url, path, mimeType }: IFileDatasetOptions) {
    this.uri = `file://${path}`;
    this.data = url;
    this.mimeType = `${mimeType}+url`;
  }
  mimeType = 'text/csv';
  uri: string;
  data: string;
}

// TODO: Possibly split this into seperaate ExtensionRegistry that is not resolver.
export class FileResolver implements IResolver<FileDataset> {
  constructor(private resolveUrl: (path: string) => Promise<string>) {}
  register(extension: string, mimeType: string) {
    this._extensions.set(extension, mimeType);
  }

  whichMimeType(path: string): string | null {
    for (const [extension, mimeType] of this._extensions.entries()) {
      if (path.endsWith(extension)) {
        return mimeType;
      }
    }
    return null;
  }

  async resolve(uri: string): Promise<FileDataset | null> {
    if (!uri.startsWith('file://')) {
      return null;
    }
    const path = uri.substr(7);
    const mimeType = this.whichMimeType(path);
    if (mimeType === null) {
      return null;
    }
    return new FileDataset({
      url: await this.resolveUrl(path),
      path,
      mimeType
    });
  }
  _extensions = new Map<string, string>();
}

export interface IFileResolver extends FileResolver {}
