import { Dataset } from './dataregistry';
import { Converter, Converts } from './converters';

const baseMimeType = 'application/x.jupyter.resolve; url=';

export function resolveMimeType(url: URL) {
  return `${baseMimeType}${url}`;
}

export function resolveDataSet(url: URL): Dataset<null> {
  return new Dataset(resolveMimeType(url), url, null);
}

function extractResolveURL(mimeType: string): URL | null {
  if (!mimeType.startsWith(baseMimeType)) {
    return null;
  }
  return new URL(mimeType.slice(baseMimeType.length));
}

export type Resolver<T> = (url: URL) => Converts<null, T>;

export function resolveConverter<T>(resolver: Resolver<T>): Converter<null, T> {
  return (mimeType: string) => {
    const url = extractResolveURL(mimeType);
    if (url === null) {
      return new Map();
    }
    return resolver(url);
  };
}
