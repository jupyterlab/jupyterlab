import { Dataset } from './dataregistry';
import { Converter, singleConverter } from './converters';

const baseMimeType = 'application/x.jupyter.unknown; url=';

function createMimeType(url: URL) {
  return `${baseMimeType}${url}`;
}

export function createURLDataset(url: URL): Dataset<null> {
  return new Dataset(createMimeType(url), url, null);
}

function extractURL(mimeType: string): URL | null {
  if (!mimeType.startsWith(baseMimeType)) {
    return null;
  }
  return new URL(mimeType.slice(baseMimeType.length));
}

export type Resolver<T> = (url: URL) => null | [string, () => Promise<T>];

export function resolverToConverter<T>(
  resolver: Resolver<T>
): Converter<null, T> {
  return singleConverter((mimeType: string) => {
    const url = extractURL(mimeType);
    if (url === null) {
      return null;
    }
    return resolver(url);
  });
}
