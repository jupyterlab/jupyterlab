export const defaultLanguageId = 'plaintext';

export function findMimeTypeForLanguage(languageId: string): string {
  const language = findLanguageById(languageId);
  if (language && language.mimetypes && language.mimetypes.length > 0) {
    return language.mimetypes[0];
  }
  return findLanguageById(defaultLanguageId)!.mimetypes[0];
}

export function findLanguageForMimeType(mimeType: string): string {
  for (const language of monaco.languages.getLanguages()) {
    if (language.mimetypes && language.mimetypes.indexOf(mimeType) !== -1) {
      return language.id;
    }
  }
  return defaultLanguageId;
}

export function findLanguageForPath(path: string): string {
  const extension = getExtension(path);
  return extension ? findLanguageForExtension(extension) : defaultLanguageId;
}

export function getExtension(path: string): string | null {
    const index = path.lastIndexOf('.');
    return index === -1 ? null : path.substring(index);
}

export function findLanguageForExtension(extension: string): string {
  for (const language of monaco.languages.getLanguages()) {
    if (language.extensions && language.extensions.indexOf(extension) !== -1) {
      return language.id;
    }
  }
  return defaultLanguageId;
}

export function findLanguageById(id: string): monaco.languages.ILanguageExtensionPoint | null {
  const result = monaco.languages.getLanguages().filter(language => language.id === id)[0];
  return result ? result : null;
}

export interface ILanguage extends monaco.languages.ILanguageExtensionPoint {
  module?: ILanguageModule;
}

export interface ILanguageModule {
  conf: monaco.languages.LanguageConfiguration;
  language: monaco.languages.IMonarchLanguage;
}

const nullDisposable: monaco.IDisposable = {
  dispose() {
    // do nothing
  }
};

export function registerLanguage(language: ILanguage, loadLanguageConfiguration: boolean = true): monaco.IDisposable {
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
