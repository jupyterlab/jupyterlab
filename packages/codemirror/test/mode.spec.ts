// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/// <reference types="../typings/codemirror/codemirror" />

import { Mode } from '@jupyterlab/codemirror';
import CodeMirror from 'codemirror';

function fakeMode(name: string) {
  return {
    mode: name,
    ext: [name],
    mime: `text/${name}`,
    name: name.toUpperCase()
  };
}

/**
 * State names used in simple mode.
 */
type S = 'start' | 'comment';

/**
 * Tokens used in simple mode.
 * */
enum T {
  AM = 'atom',
  AT = 'attribute',
  BE = 'builtin.em',
  BI = 'builtin',
  BK = 'bracket',
  CM = 'comment',
  DF = 'def',
  HL = 'header',
  KW = 'keyword',
  MT = 'meta',
  NB = 'number',
  OP = 'operator',
  PC = 'punctuation',
  PR = 'property',
  SE = 'string.em',
  SH = 'string.header',
  SS = 'string.strong',
  SSE = 'string.strong.em',
  S2 = 'string-2',
  ST = 'string',
  TG = 'tag',
  V1 = 'variable',
  V2 = 'variable-2',
  V3 = 'variable-3'
}

/**
 * Simple mode states from CodeMirror demo:
 * from https://codemirror.net/demo/simplemode.html
 */
const FAKE_SIMPLE_STATES: CodeMirror.TSimpleTopState<S, T> = {
  // The start state contains the rules that are initially used
  start: [
    // The regex matches the token, the token property contains the type
    { regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: T.ST },
    // You can match multiple tokens at once. Note that the captured
    // groups must span the whole string in this case
    { regex: /(function)(\s+)([a-z$][\w$]*)/, token: [T.KW, null, T.V2] },
    // Rules are matched in the order in which they appear, so there is
    // no ambiguity between this one and the one above
    {
      regex: /(?:function|var|return|if|for|while|else|do|this)\b/,
      token: T.KW
    },
    { regex: /true|false|null|undefined/, token: T.AT },
    {
      regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i,
      token: T.NB
    },
    { regex: /\/\/.*/, token: T.CM },
    { regex: /\/(?:[^\\]|\\.)*?\//, token: T.V3 },
    // A next property will cause the mode to move to a different state
    { regex: /\/\*/, token: T.CM, next: T.CM },
    { regex: /[-+\/*=<>!]+/, token: T.OP },
    // indent and dedent properties guide autoindentation
    { regex: /[\{\[\(]/, indent: true },
    { regex: /[\}\]\)]/, dedent: true },
    { regex: /[a-z$][\w$]*/, token: T.V1 },
    // You can embed other modes with the mode property. This rule
    // causes all code between << and >> to be highlighted with the XML
    // mode.
    { regex: /<</, token: T.MT, mode: { spec: 'xml', end: />>/ } }
  ],
  // The multi-line comment state.
  comment: [
    { regex: /.*?\*\//, token: T.CM, next: 'start' },
    { regex: /.*/, token: T.CM }
  ]
};

FAKE_SIMPLE_STATES.meta = {
  dontIndentStates: ['comment']
};

describe('Mode', () => {
  describe('#ensure', () => {
    it('should load a defined spec', async () => {
      CodeMirror.modeInfo.push(fakeMode('foo'));
      CodeMirror.defineMode('foo', () => {
        return {};
      });
      const spec = (await Mode.ensure('text/foo'))!;
      expect(spec.name).toBe('FOO');
    });

    it('should load a bundled spec', async () => {
      const spec = (await Mode.ensure('application/json'))!;
      expect(spec.name).toBe('JSON');
    });

    it('should add a spec loader', async () => {
      let called = 0;
      let loaded = 0;

      Mode.addSpecLoader(async spec => {
        called++;
        if (spec.mode !== 'bar') {
          return false;
        }
        loaded++;
        return true;
      }, 42);

      CodeMirror.modeInfo.push(fakeMode('bar'));

      let spec = await Mode.ensure('bar');
      expect(called).toBe(1);
      expect(loaded).toBe(1);
      expect(spec!.name).toBe('BAR');

      spec = await Mode.ensure('python');
      expect(called).toBe(1);
      expect(loaded).toBe(1);

      try {
        spec = await Mode.ensure('APL');
      } catch (err) {
        // apparently one cannot use webpack `require` in jest
      }
      expect(called).toBe(2);
      expect(loaded).toBe(1);
    });

    it('should default to plain text', async () => {
      const spec = (await Mode.ensure('this is not a mode'))!;
      expect(spec.name).toBe('Plain Text');
    });

    it('should create a simple mode', async () => {
      CodeMirror.modeInfo.push(fakeMode('baz'));
      CodeMirror.defineSimpleMode('baz', FAKE_SIMPLE_STATES);
      const spec = (await Mode.ensure('text/baz'))!;
      expect(spec.name).toBe('BAZ');
    });
  });
});
