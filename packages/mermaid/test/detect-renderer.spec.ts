// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { RE_DEFAULT_RENDERER } from '@jupyterlab/mermaid';

import { GOOD_MERMAID } from './utils';

const ELK_PERCENT_INITS = {
  'as documented': `%%{init: {"flowchart": {"defaultRenderer": "elk"}}}%%`,
  'with whitespace': `%%{init: {"flowchart": {

  "defaultRenderer":

    'elk'

    }}}%%`
};

const ELK_YAML_CONFIGS = {
  standard: `
  config:
    flowchart:
      defaultRenderer: elk`,
  dangling: `
      config:
        flowchart:
          defaultRenderer:
            elk`,
  inline: `
  config: {flowchart: {'defaultRenderer'  : "elk"   }}
  `
};

const CASES: Record<string, string> = {};

for (const [label, directive] of Object.entries(ELK_PERCENT_INITS)) {
  CASES[`%%init ${label} above diagram`] = `${directive}
${GOOD_MERMAID}
`;
  CASES[`%%init ${label} below diagram`] = `${GOOD_MERMAID}
${directive}`;
}

for (const [label, yaml] of Object.entries(ELK_YAML_CONFIGS)) {
  CASES[`YAML as ${label} front-matter`] = `---
${yaml}
---
${GOOD_MERMAID}`;
}

describe('@jupyterlab/mermaid', () => {
  describe('ensureRenderer regular expression', () => {
    test.each(Object.keys(CASES))('should parse renderer from %s', name => {
      const matches = [...CASES[name].matchAll(RE_DEFAULT_RENDERER)];
      const renderers = matches.map(m => m[2]);
      expect(renderers).toContain('elk');
    });
  });
});
