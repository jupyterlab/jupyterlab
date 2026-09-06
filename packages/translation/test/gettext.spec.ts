// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Gettext } from '@jupyterlab/translation';

let JSON_TEST_DATA = {
  '': {
    domain: 'jupyterlab',
    language: 'es',
    pluralForms: 'nplurals=2; plural=n>1;',
    version: '2.2.0rc1'
  },
  Welcome: ['Bienvenido'],
  'Welcome %1': ['Bienvenido %1'],
  'Context\u0004Welcome': ['Hola'],
  'Context\u0004Welcome %1': ['Hola %1'],
  'There is %1 apple': ['Hay %1 manzana', 'Hay %1 manzanas'],
  'There is %1 apple, %2!': ['Hay %1 manzana, %2!', 'Hay %1 manzanas, %2!']
};
let JSON_TEST_DATA_VARIATION = {
  '': {
    domain: 'jupyterlab',
    language: 'es-CO',
    pluralForms: 'nplurals=2; plural=n>1;',
    version: '2.2.0rc1'
  },
  Welcome: ['Bienvenido pirobo']
};

describe('@jupyterlab/translation', () => {
  const trans = new Gettext({ domain: 'jupyterlab', locale: 'es' });
  trans.loadJSON(JSON_TEST_DATA, 'jupyterlab');
  trans.loadJSON(JSON_TEST_DATA_VARIATION, 'jupyterlab');

  describe('Gettext', () => {
    describe('#gettext', () => {
      it('should test whether the gettext bundle gettext/__ works', () => {
        // Shorthand method
        expect(trans.__('Welcome')).toBe('Bienvenido');
        expect(trans.__('Welcome %1', 'Joe')).toBe('Bienvenido Joe');

        // Normal method
        expect(trans.gettext('Welcome')).toBe('Bienvenido');
        expect(trans.gettext('Welcome %1', 'Joe')).toBe('Bienvenido Joe');
      });
    });

    describe('#pgettext', () => {
      it('should test whether the gettext  bundle pgettext/_p works', () => {
        // Shorthand method
        expect(trans._p('Context', 'Welcome')).toBe('Hola');
        expect(trans._p('Context', 'Welcome %1', 'Joe')).toBe('Hola Joe');

        // Normal method
        expect(trans.pgettext('Context', 'Welcome')).toBe('Hola');
        expect(trans.pgettext('Context', 'Welcome %1', 'Joe')).toBe('Hola Joe');
      });
    });

    describe('#ngettext', () => {
      it('should test whether the gettext bundle ngettext/_n works', () => {
        // Shorthand method
        expect(trans._n('There is %1 apple', 'There are %1 apples', 1)).toBe(
          'Hay 1 manzana'
        );
        expect(trans._n('There is %1 apple', 'There are %1 apples', 2)).toBe(
          'Hay 2 manzanas'
        );
        expect(
          trans._n('There is %1 apple, %2!', 'I have %1 apples %2', 1, 'Joe')
        ).toBe('Hay 1 manzana, Joe!');
        expect(
          trans._n('There is %1 apple, %2!', 'I have %1 apples %2', 2, 'Joe')
        ).toBe('Hay 2 manzanas, Joe!');

        // Normal method
        expect(
          trans.ngettext('There is %1 apple', 'There are %1 apples', 1)
        ).toBe('Hay 1 manzana');
        expect(
          trans.ngettext('There is %1 apple', 'There are %1 apples', 2)
        ).toBe('Hay 2 manzanas');
        expect(
          trans.ngettext(
            'There is %1 apple, %2!',
            'I have %1 apples %2',
            1,
            'Joe'
          )
        ).toBe('Hay 1 manzana, Joe!');
        expect(
          trans.ngettext(
            'There is %1 apple, %2!',
            'I have %1 apples %2',
            2,
            'Joe'
          )
        ).toBe('Hay 2 manzanas, Joe!');
      });
    });

    describe('#fallbackLocale', () => {
      it('should test whether the gettext  bundle pgettext/_p works', () => {
        trans.setLocale('es-CO');

        // Shorthand method
        expect(trans.__('Welcome')).toBe('Bienvenido pirobo');

        // Normal method
        expect(trans.gettext('Welcome')).toBe('Bienvenido pirobo');
      });
    });
  });
});
