/**
 * Start with files as unkown mimetype
 *
 * Then convert to known filetype, with URL on it.
 */
import { Converter } from './converters';
import { URLDataType } from './urls';
import { DataTypeStringArg } from './datatype';
import { resolveMimetypeDataType } from './resolvers';

export type FilePath = string;
export const fileDataType = new DataTypeStringArg<FilePath>(
  'application/x.jupyter.file',
  'mimeType'
);
export function createFileURL(path: string): URL {
  const url = new URL('file:');
  url.pathname = path;
  return url;
}

/**
 * Creates a converter from a resolver mimetype to a file mimetype.
 */
export const resolveFileConverter = resolveMimetypeDataType.createSingleTypedConverter(
  fileDataType,
  (innerMimeType, url) => {
    const path = parseFileURL(url);
    if (path === null) {
      return null;
    }
    return [innerMimeType, async () => path];
  }
);

/**
 * Creates a converter from file paths to their download URLs
 */
export function fileURLConverter(
  getDownloadURL: (path: FilePath) => Promise<URL>
): Converter<FilePath, URL | string> {
  return fileDataType.createSingleTypedConverter(URLDataType, mimeType => [
    mimeType,
    getDownloadURL
  ]);
}

/**
 * Returns the path of a file URL, or null if it is not one.
 * @param url
 */
function parseFileURL(url: URL): null | FilePath {
  if (url.protocol !== 'file:') {
    return null;
  }
  return url.pathname;
}
