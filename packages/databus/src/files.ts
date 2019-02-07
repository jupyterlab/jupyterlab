/**
 * Start with files as unkown mimetype
 *
 * Then convert to known filetype, with URL on it.
 */
import { resolveConverter } from './resolvers';
import { Converter, singleConverter } from './converters';
import { URLMimeType } from './urls';

const baseMimeType = 'application/x.jupyter.file; mimeType=';

function fileMimeType(mimeType: string) {
  return `${baseMimeType}${mimeType}`;
}

export function extractFileMimeType(mimeType: string): string | null {
  if (!mimeType.startsWith(baseMimeType)) {
    return null;
  }
  return mimeType.slice(baseMimeType.length);
}
export function createFileURL(path: string): URL {
  const url = new URL('file:');
  url.pathname = path;
  return url;
}

/**
 * Creates a converter from a resolver mimetype to a file mimetype.
 */
export function resolveFileConverter(
  extension: string,
  mimeType: string
): Converter<null, string> {
  return resolveConverter((url: URL) => {
    const path = parseFileURL(url);
    if (path === null || !path.endsWith(extension)) {
      return new Map();
    }
    return new Map([[fileMimeType(mimeType), async () => path]]);
  });
}

/**
 * Creates a converter from file paths to their download URLs
 */
export function fileURLConverter(
  getDownloadURL: (path: string) => Promise<URL>
): Converter<string, URL> {
  return singleConverter((mimeType: string) => {
    const resMimeType = extractFileMimeType(mimeType);
    if (resMimeType === null) {
      return null;
    }
    return [URLMimeType(resMimeType), getDownloadURL];
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
