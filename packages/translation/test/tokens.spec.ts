// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { TranslatorConnector } from '@jupyterlab/translation';

describe('@jupyterlab/translation', () => {
  describe('TranslatorConnector', () => {
    describe('#fetch()', () => {
      let requested: string[];
      let connector: TranslatorConnector;

      beforeEach(() => {
        requested = [];
        const serverSettings = ServerConnection.makeSettings({
          fetch: async (input: RequestInfo) => {
            requested.push(typeof input === 'string' ? input : input.url);
            return new Response(JSON.stringify({ data: {}, message: '' }));
          }
        });
        connector = new TranslatorConnector('', serverSettings);
      });

      afterEach(() => {
        PageConfig.setOption('serverLocale', '');
      });

      it('should not request translations for English', async () => {
        expect(await connector.fetch({ language: 'en' })).toEqual({
          data: {},
          message: ''
        });
        expect(requested).toEqual([]);
      });

      it.each(['en', 'en_US'])(
        'should not request the default locale when the server locale is %s',
        async serverLocale => {
          PageConfig.setOption('serverLocale', serverLocale);
          await connector.fetch({ language: 'default' });
          expect(requested).toEqual([]);
        }
      );

      it.each([
        ['default', 'fr_FR'],
        ['default', ''],
        ['en_GB', 'en_US'],
        ['fr_FR', 'en_US']
      ])(
        'should request %s when the server locale is "%s"',
        async (language, serverLocale) => {
          PageConfig.setOption('serverLocale', serverLocale);
          await connector.fetch({ language });
          expect(requested).toHaveLength(1);
          expect(new URL(requested[0]).pathname).toMatch(
            new RegExp(`/api/translations/${language}$`)
          );
        }
      );

      it('should request the list of languages', async () => {
        PageConfig.setOption('serverLocale', 'en_US');
        await connector.fetch();
        expect(requested).toHaveLength(1);
      });
    });
  });
});
