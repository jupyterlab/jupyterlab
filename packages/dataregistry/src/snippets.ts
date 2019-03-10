/**
 * Support for exporting datasets as code snippets.
 */

import { viewerDataType, View } from './viewers';
import { Converter } from './converters';
import { FilePath, fileDataType } from './files';
import { URLDataType } from './urls';

import { relative, dirname } from 'path';
import { DataTypeStringArg } from './datatype';

type SnippetContext = {
  path: string;
};

type Snippet = (context: SnippetContext) => string;

export const snippedDataType = new DataTypeStringArg<Snippet>(
  'application/x.jupyter.snippet',
  'label'
);

export interface IFileSnippetConverterOptions {
  mimeType: string;
  createSnippet: (path: string) => string;
  label: string;
}

export function fileSnippetConverter({
  mimeType,
  createSnippet,
  label
}: IFileSnippetConverterOptions): Converter<FilePath, Snippet> {
  return fileDataType.createSingleTypedConverter(
    snippedDataType,
    innerMimeType => {
      if (innerMimeType !== mimeType) {
        return null;
      }
      return [
        label,
        async (dataPath: FilePath) => (context: SnippetContext) => {
          return createSnippet(relative(dirname(context.path), dataPath));
        }
      ];
    }
  );
}

export interface IURLSnippetConverter {
  mimeType: string;
  createSnippet: (url: string | URL) => string;
  label: string;
}

export function URLSnippetConverter({
  mimeType,
  createSnippet,
  label
}: IURLSnippetConverter): Converter<URL | string, Snippet> {
  return URLDataType.createSingleTypedConverter(
    snippedDataType,
    (innerMimeType: string) => {
      if (innerMimeType !== mimeType) {
        return null;
      }
      return [label, async (url: string | URL) => () => createSnippet(url)];
    }
  );
}

export function snippetViewerConverter(
  insert: (snippet: string) => Promise<void>,
  getContext: () => Promise<SnippetContext>
): Converter<Snippet, View> {
  return snippedDataType.createSingleTypedConverter(viewerDataType, label => {
    return [
      label,
      async data => async () => await insert(data(await getContext()))
    ];
  });
}
