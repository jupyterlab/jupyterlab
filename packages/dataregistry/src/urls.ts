import { DataTypeStringArg } from './datatype';
import { resolveMimetypeDataType } from './resolvers';

/**
 * Type where data is a HTTP URL pointing to the data.
 *
 * Note: it can either be a URL or a string type to accomedate loading it directly
 * from JSON as a string type.
 */
export const URLDataType = new DataTypeStringArg<URL | string>(
  'application/x.jupyter.url',
  'mimeType'
);

export const resolverURLConverter = resolveMimetypeDataType.createSingleTypedConverter(
  URLDataType,
  (resMimeType, url) => {
    const isHTTP = url.protocol === 'http:';
    const isHTTPS = url.protocol === 'https:';
    if (isHTTP || isHTTPS) {
      return [resMimeType, async () => url];
    }
    return null;
  }
);

async function fetchURL(url: URL | string): Promise<string> {
  const response = await fetch(url.toString());
  return await response.text();
}

export const URLStringConverter = URLDataType.createSingleConverter<string>(
  mimeType => [mimeType, fetchURL]
);
