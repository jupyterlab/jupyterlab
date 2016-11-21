import {
    getExtension
} from './uris';

export function findLanguageForMimeType(mimeType: string): string | null {
    for (const language of monaco.languages.getLanguages()) {
        if (language.mimetypes && language.mimetypes.indexOf(mimeType) !== -1) {
            return language.id;
        }
    }
    return null;
}

export function findLanguageForExtension(extension: string): string | null {
    for (const language of monaco.languages.getLanguages()) {
        if (language.extensions && language.extensions.indexOf(extension) !== -1) {
            return language.id;
        }
    }
    return null;
}

export function findLanguageById(id: string): monaco.languages.ILanguageExtensionPoint {
    return monaco.languages.getLanguages().filter((language) => language.id === id)[0];
}

export function findLanguageForUri(uri: monaco.Uri): string | null {
    const extension = getExtension(uri);
    return extension ? findLanguageForExtension(extension) : null;
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
}