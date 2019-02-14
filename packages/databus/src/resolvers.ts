import { Dataset } from './dataregistry';
import { Converter, Converts } from './converters';

export const resolveMimeType = 'application/x.jupyter.resolve';
const baseMimeTypeKnown = 'application/x.jupyter.resolve; mimetype=';

export function resolveMimeTypeKnown(mimeType: string) {
  return `${baseMimeTypeKnown}${mimeType}`;
}

export function resolveDataSet(url: URL): Dataset<null> {
  return new Dataset(resolveMimeType, url, null);
}

export function extractResolveMimeType(mimeType: string): string | null {
  if (!mimeType.startsWith(baseMimeTypeKnown)) {
    return null;
  }
  return mimeType.slice(baseMimeTypeKnown.length);
}

/**
 * Returns a set of possible mimetype for a URL.
 */
export type Resolver<T> = (url: URL) => Set<string>;

export function resolveConverter<T>(
  resolver: Resolver<T>
): Converter<null, null> {
  return (mimeType: string, url: URL) => {
    const res: Converts<null, null> = new Map();
    if (resolveMimeType !== mimeType) {
      return res;
    }
    for (const mimeType of resolver(url)) {
      res.set(resolveMimeTypeKnown(mimeType), async () => null);
    }
    return res;
  };
}

/**
 * Creates a converter from a resolver mimetype to a file mimetype.
 */
export function resolveExtensionConverter(
  extension: string,
  mimeType: string
): Converter<null, null> {
  return resolveConverter((url: URL) => {
    if (url.pathname.endsWith(extension)) {
      return new Set([mimeType]);
    }
    return new Set();
  });
}
