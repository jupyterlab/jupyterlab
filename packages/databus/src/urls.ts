import { IDataset } from './dataregistry';
import { IConverter } from './converters';

const MIMETYPE_POSTFIX = '+url';
export class URLDataset implements IDataset<URL> {
  constructor(url: URL, mimeType: string) {
    this.data = url;
    this.mimeType = `${mimeType}${MIMETYPE_POSTFIX}`;
  }
  mimeType: string;
  data: URL;
}

export class FetchURL implements IConverter<URLDataset, IDataset<string>> {
  computeTargetMimeType(sourceMimeType: string): string | null {
    if (sourceMimeType.endsWith(MIMETYPE_POSTFIX)) {
      return sourceMimeType.slice(
        0,
        sourceMimeType.length - MIMETYPE_POSTFIX.length
      );
    }
    return;
  }
  async converter(input: URLDataset): Promise<IDataset<string>> {
    const response = await fetch(input.data.toString());
    return {
      mimeType: this.computeTargetMimeType(input.mimeType),
      data: await response.text()
    };
  }
}
