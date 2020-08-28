// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { nullTranslator } from '@jupyterlab/translation';

describe('@jupyterlab/translation', () => {
  const trans = nullTranslator.load('some-domain');

  describe('BasicTranslator', () => {
    describe('#getInstance', () => {
      it('should return the instance of the EmptyTranslator', () => {
        expect(trans.gettext('Hello!')).toBe('Hello!');
      });
    });

    describe('#dummygettext', () => {
      it('should test whether the dummy bundle gettext/__ works', () => {
        // Shorthand method
        expect(trans.__('Hello!')).toBe('Hello!');
        expect(trans.__('Hello %1!', 'Joe')).toBe('Hello Joe!');

        // Normal method
        expect(trans.gettext('Hello!')).toBe('Hello!');
        expect(trans.gettext('Hello %1!', 'Joe')).toBe('Hello Joe!');
      });
    });

    describe('#dummypgettext', () => {
      it('should test whether the dummy bundle pgettext/_p works', () => {
        // Shorthand method
        expect(trans._p('Some context', 'Hello!')).toBe('Hello!');
        expect(trans._p('Some context', 'Hello %1!', 'Joe')).toBe('Hello Joe!');

        // Normal method
        expect(trans.pgettext('Some context', 'Hello!')).toBe('Hello!');
        expect(trans.pgettext('Some context', 'Hello %1!', 'Joe')).toBe(
          'Hello Joe!'
        );
      });
    });

    describe('#dummyngettext', () => {
      it('should test whether the dummy bundle ngettext/_n works', () => {
        // Shorthand method
        expect(trans._n('I have %1 apple', 'I have %1 apples', 1)).toBe(
          'I have 1 apple'
        );
        expect(trans._n('I have %1 apple', 'I have %1 apples', 2)).toBe(
          'I have 2 apples'
        );
        expect(
          trans._n('I have %1 apple %2', 'I have %1 apples %2', 1, 'Joe')
        ).toBe('I have 1 apple Joe');
        expect(
          trans._n('I have %1 apple %2', 'I have %1 apples %2', 2, 'Joe')
        ).toBe('I have 2 apples Joe');

        // Normal method
        expect(trans.ngettext('I have %1 apple', 'I have %1 apples', 1)).toBe(
          'I have 1 apple'
        );
        expect(trans.ngettext('I have %1 apple', 'I have %1 apples', 2)).toBe(
          'I have 2 apples'
        );
        expect(
          trans.ngettext('I have %1 apple %2', 'I have %1 apples %2', 1, 'Joe')
        ).toBe('I have 1 apple Joe');
        expect(
          trans.ngettext('I have %1 apple %2', 'I have %1 apples %2', 2, 'Joe')
        ).toBe('I have 2 apples Joe');
      });
    });

    describe('#dummynpgettext', () => {
      it('should test whether the dummy bundle npgettext/_np works', () => {
        // Shorthand method
        expect(
          trans._np('Some context', 'I have %1 apple', 'I have %1 apples', 1)
        ).toBe('I have 1 apple');
        expect(
          trans._np('Some context', 'I have %1 apple', 'I have %1 apples', 2)
        ).toBe('I have 2 apples');
        expect(
          trans._np(
            'Some context',
            'I have %1 apple %2',
            'I have %1 apples %2',
            1,
            'Joe'
          )
        ).toBe('I have 1 apple Joe');
        expect(
          trans._np(
            'Some context',
            'I have %1 apple %2',
            'I have %1 apples %2',
            2,
            'Joe'
          )
        ).toBe('I have 2 apples Joe');

        // Normal method
        expect(
          trans.npgettext(
            'Some context',
            'I have %1 apple',
            'I have %1 apples',
            1
          )
        ).toBe('I have 1 apple');
        expect(
          trans.npgettext(
            'Some context',
            'I have %1 apple',
            'I have %1 apples',
            2
          )
        ).toBe('I have 2 apples');
        expect(
          trans.npgettext(
            'Some context',
            'I have %1 apple %2',
            'I have %1 apples %2',
            1,
            'Joe'
          )
        ).toBe('I have 1 apple Joe');
        expect(
          trans.npgettext(
            'Some context',
            'I have %1 apple %2',
            'I have %1 apples %2',
            2,
            'Joe'
          )
        ).toBe('I have 2 apples Joe');
      });
    });
  });
  describe('#dummydcnpgettext', () => {
    it('should test whether the dummy bundle dcnpgettext works', () => {
      expect(
        trans.dcnpgettext(
          'jupyterlab',
          'Some context',
          'I have %1 apple',
          'I have %1 apples',
          1
        )
      ).toBe('I have 1 apple');
      expect(
        trans.dcnpgettext(
          'jupyterlab',
          'Some context',
          'I have %1 apple',
          'I have %1 apples',
          2
        )
      ).toBe('I have 2 apples');
      expect(
        trans.dcnpgettext(
          'jupyterlab',
          'Some context',
          'I have %1 apple %2',
          'I have %1 apples %2',
          1,
          'Joe'
        )
      ).toBe('I have 1 apple Joe');
      expect(
        trans.dcnpgettext(
          'jupyterlab',
          'Some context',
          'I have %1 apple %2',
          'I have %1 apples %2',
          2,
          'Joe'
        )
      ).toBe('I have 2 apples Joe');
    });
  });
});
