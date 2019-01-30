import { IDataset } from './dataregistry';
import { IConverter } from './converters';

const MIMETYPE_POSTFIX = '+url';
/**
 * Dataset where the data is URL pointing to a file that can be fetched.
 */
export class URLDataset implements IDataset<URL> {
  constructor(dataURL: URL, mimeType: string, public url: URL) {
    this.data = dataURL;
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
  async converter({
    data,
    mimeType,
    url
  }: URLDataset): Promise<IDataset<string>> {
    const response = await fetch(data.toString());
    return {
      mimeType: this.computeTargetMimeType(mimeType),
      data: await response.text(),
      url
    };
  }
}
