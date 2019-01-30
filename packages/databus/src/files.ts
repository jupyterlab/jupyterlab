import { IResolver } from './resolverregistry';
import { Token } from '@phosphor/coreutils';
import { URLDataset } from './urls';

interface IFileDatasetOptions {
  url: URL;
  path: string;
  mimeType: string;
}
export class FileDataset extends URLDataset {
  constructor({ url, path, mimeType }: IFileDatasetOptions) {
    super(url, mimeType, new URL('file:'));
    this.url.pathname = path;
  }
}

export class FileExtensionRegistry {
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

  _extensions = new Map<string, string>();
}
export interface IFileExtensionRegistry extends FileExtensionRegistry {}

/* tslint:disable */
export const IFileExtensionRegistry = new Token<IFileExtensionRegistry>(
  '@jupyterlab/databus:IFileExtensionRegistry'
);

export interface IFileResolverOptions {
  fileExtensionRegistry: FileExtensionRegistry;
  resolveURL: (path: string) => Promise<URL>;
}

export class FileResolver implements IResolver<FileDataset> {
  constructor(private options: IFileResolverOptions) {}

  async resolve(url: URL): Promise<FileDataset | null> {
    if (url.protocol !== 'file:') {
      return null;
    }
    const path = url.pathname;
    const mimeType = this.options.fileExtensionRegistry.whichMimeType(path);
    if (mimeType === null) {
      return null;
    }
    return new FileDataset({
      url: await this.options.resolveURL(path),
      path,
      mimeType
    });
  }
}
