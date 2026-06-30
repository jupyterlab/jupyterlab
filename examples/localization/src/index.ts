// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import type { ILanguageList, TranslationBundle } from '@jupyterlab/translation';
import {
  TranslationManager,
  TranslatorConnector
} from '@jupyterlab/translation';

const webpackWindow = window as Window & { __webpack_public_path__?: string };
webpackWindow.__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'example/'
);

import './style';

async function main(): Promise<void> {
  const root = document.createElement('main');
  root.id = 'main';
  root.setAttribute('data-testid', 'localization-example');

  const header = document.createElement('header');
  header.className = 'jp-Localization-header';
  const title = document.createElement('h1');
  title.setAttribute('data-testid', 'translated-title');
  const description = document.createElement('p');
  header.append(title, description);

  const greeting = document.createElement('p');
  greeting.className = 'jp-Localization-greeting';

  const languageField = document.createElement('div');
  languageField.className = 'jp-Localization-field';
  const languageLabel = document.createElement('label');
  languageLabel.htmlFor = 'language-select';
  const languageSelect = document.createElement('select');
  languageSelect.id = 'language-select';
  languageSelect.setAttribute('data-testid', 'language-select');
  languageField.append(languageLabel, languageSelect);

  const itemCount = document.createElement('p');
  itemCount.setAttribute('data-testid', 'item-count');
  itemCount.setAttribute('aria-live', 'polite');
  const counter = document.createElement('div');
  counter.className = 'jp-Localization-counter';
  const controls = document.createElement('div');
  controls.className = 'jp-Localization-controls';
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  const addButton = document.createElement('button');
  addButton.type = 'button';
  controls.append(removeButton, addButton);
  counter.append(itemCount, controls);

  const status = document.createElement('p');
  status.className = 'jp-Localization-status';
  status.setAttribute('role', 'alert');

  root.append(header, languageField, greeting, counter, status);
  document.body.append(root);

  const translationsUrl = PageConfig.getOption('translationsApiUrl');
  let count = 1;
  let trans: TranslationBundle | undefined;

  const render = (): void => {
    if (!trans) {
      return;
    }
    title.textContent = trans.__('Localization example');
    description.textContent = trans.__(
      'This example uses its own translation catalog.'
    );
    languageLabel.textContent = trans.__('Language');
    greeting.textContent = trans.__('Hello, %1!', 'JupyterLab');
    itemCount.textContent = trans._n(
      'There is %1 item',
      'There are %1 items',
      count
    );
    removeButton.textContent = trans.__('Remove item');
    addButton.textContent = trans.__('Add item');
    removeButton.disabled = count === 0;
  };

  const showError = (reason: unknown): void => {
    status.textContent =
      trans?.__('Unable to load translations.') ??
      'Unable to load translations.';
    console.error('Failed to load translations.', reason);
  };

  const connector = new TranslatorConnector(translationsUrl);
  let languageList: ILanguageList;
  try {
    languageList = await connector.fetch();
  } catch (reason) {
    showError(reason);
    return;
  }

  for (const [locale, language] of Object.entries(languageList.data)) {
    const option = document.createElement('option');
    option.value = locale;
    option.textContent =
      language.displayName === language.nativeName
        ? language.nativeName
        : `${language.displayName} - ${language.nativeName}`;
    languageSelect.append(option);
  }

  const loadLocale = async (locale: string): Promise<void> => {
    languageSelect.disabled = true;
    removeButton.disabled = true;
    addButton.disabled = true;
    status.textContent = '';

    try {
      const translator = new TranslationManager(translationsUrl);
      await translator.fetch(locale);
      trans = translator.load('jupyterlab_localization_example');
      document.documentElement.lang = translator.languageCode;
      render();
    } finally {
      languageSelect.disabled = false;
      addButton.disabled = !trans;
      removeButton.disabled = !trans || count === 0;
    }
  };

  languageSelect.addEventListener('change', () => {
    void loadLocale(languageSelect.value).catch(showError);
  });
  removeButton.addEventListener('click', () => {
    count = Math.max(0, count - 1);
    render();
  });
  addButton.addEventListener('click', () => {
    count += 1;
    render();
  });

  languageSelect.value = 'en';
  try {
    await loadLocale('en');
    console.debug('Example started!');
  } catch (reason) {
    showError(reason);
  }
}

window.addEventListener('load', () => {
  void main().catch(reason => {
    console.error('Failed to start the localization example.', reason);
  });
});
