/**
 * Start with files as unkown mimetype
 *
 * Then convert to known filetype, with URL on it.
 */
import { Dataset } from './dataregistry';
import { createURLDataset, resolverToConverter } from './resolvers';
import { Converter } from './converters';

export function createFileDataSet(path: string): Dataset<null> {
  const url = new URL('file:');
  url.pathname = path;
  return createURLDataset(url);
}

export function createFileConverter(
  getDownloadURL: (path: string) => Promise<URL>,
  extension: string,
  mimeType: string
): Converter<null, URL> {
  return resolverToConverter((url: URL) => {
    const path = parseFileURL(url);
    if (path === null || !path.endsWith(extension)) {
      return null;
    }
    return [mimeType, () => getDownloadURL(path)];
  });
}

/**
 * Returns the path of a file URL, or null if it is not one.
 * @param url
 */
function parseFileURL(url: URL): null | string {
  if (url.protocol !== 'file:') {
    return null;
  }
  return url.pathname;
}
