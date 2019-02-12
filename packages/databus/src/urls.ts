import { Converter, seperateConverter } from './converters';

const baseMimeType = 'application/x.jupyter.url; mimeType=';

export function createURLMimeType(url: URL) {
  return `${baseMimeType}${url}`;
}

function computeMimeType(mimeType: string): string | null {
  if (!mimeType.startsWith(baseMimeType)) {
    return null;
  }
  return mimeType.slice(baseMimeType.length);
}

export const fetchConverter: Converter<URL, string> = seperateConverter({
  computeMimeType,
  convert: async (url: URL) => {
    const response = await fetch(url.toString());
    return await response.text();
  }
});
