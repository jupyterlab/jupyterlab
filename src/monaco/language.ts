// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IEditorMimeTypeService
} from '../codeeditor';

/**
 * The default language id.
 */
export
const defaultLanguageId = 'plaintext';

/**
 * Returns a mime type for the given language id.
 */
export
function findMimeTypeForLanguageId(languageId: string | null): string {
  const language = findLanguageById(languageId);
  return getMimeTypeForLanguage(language);
}

/**
 * Returns a mime type for the given language.
 */
export
function getMimeTypeForLanguage(language: monaco.languages.ILanguageExtensionPoint | null): string {
  if (language && language.mimetypes && language.mimetypes.length > 0) {
    return language.mimetypes[0];
  }
  return IEditorMimeTypeService.defaultMimeType;
}

/**
 * Returns a language if for the given mime type.
 */
export
function findLanguageIdForMimeType(mimeType: string): string {
  const language = findLanguageForMimeType(mimeType);
  return language ? language.id : defaultLanguageId;
}

/**
 * Returns a language for the given mime type or `null` if it cannot be found.
 */
export
function findLanguageForMimeType(mimeType: string): monaco.languages.ILanguageExtensionPoint | null {
  for (const language of monaco.languages.getLanguages()) {
    if (language.mimetypes && language.mimetypes.indexOf(mimeType) !== -1) {
      return language;
    }
  }
  return null;
}

/**
 * Returns a language if for the given path.
 */
export
function findLanguageIdForPath(path: string): string {
  const language = findLanguageForPath(path);
  return language ? language.id : defaultLanguageId;
}

/**
 * Return a monaco language for the given path or `null` if it is not found.
 */
export
function findLanguageForPath(path: string): monaco.languages.ILanguageExtensionPoint | null {
  const extension = getExtension(path);
  return findLanguageForExtension(extension);
}

/**
 * Returns a file extension for the given path.
 */
export
function getExtension(path: string): string {
    const index = path.lastIndexOf('.');
    return index === -1 ? path : path.substring(index);
}

/**
 * Return a monaco language for the given extension or `null` if it is not found.
 */
export
function findLanguageForExtension(extension: string): monaco.languages.ILanguageExtensionPoint | null {
  for (const language of monaco.languages.getLanguages()) {
    if (language.extensions && language.extensions.indexOf(extension) !== -1) {
      return language;
    }
  }
  return null;
}

/**
 * Returns a language for given id or `null` if it cannot be found.
 */
export
function findLanguageById(id: string | null): monaco.languages.ILanguageExtensionPoint | null {
  const result = monaco.languages.getLanguages().filter(language => language.id === id)[0];
  return result ? result : null;
}

/**
 * A language.
 */
export
interface ILanguage extends monaco.languages.ILanguageExtensionPoint {
  module?: ILanguageModule;
}

/**
 * A language module.
 */
export
interface ILanguageModule {
  conf: monaco.languages.LanguageConfiguration;
  language: monaco.languages.IMonarchLanguage;
}

const nullDisposable: monaco.IDisposable = {
  dispose() {
    // do nothing
  }
};

/**
 * Registers the given language and loads a language module configuration if it is present.
 */
export
function registerLanguage(language: ILanguage, loadLanguageConfiguration: boolean = true): monaco.IDisposable {
  monaco.languages.register(language);

  const module = language.module;
  if (!loadLanguageConfiguration || !module) {
    return nullDisposable;
  }

  const languageId = language.id;
  return monaco.languages.onLanguage(languageId, () => {
    monaco.languages.setMonarchTokensProvider(languageId, module.language);
    monaco.languages.setLanguageConfiguration(languageId, module.conf);
  });
};
