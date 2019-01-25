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

export class CSVFileResolver implements IResolver<FileDataset> {
  constructor(private resolveUrl: (path: string) => Promise<string>) {}
  async resolve(uri: string): Promise<FileDataset | null> {
    if (uri.startsWith('file://') && uri.endsWith('.csv')) {
      const path = uri.substr(7);
      return new FileDataset({
        url: await this.resolveUrl(path),
        path,
        mimeType: 'text/csv'
      });
    }
  }
}
