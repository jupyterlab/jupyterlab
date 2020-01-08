import { IForeignCodeExtractorsRegistry } from './types';
import { RegExpForeignCodeExtractor } from './regexp';

// TODO: make the regex code extractors configurable
export let foreign_code_extractors: IForeignCodeExtractorsRegistry = {
  // general note: to match new lines use [^] instead of dot, unless the target is ES2018, then use /s
  python: [
    //
    // R magics (non-standalone: the R code will always be in the same, single R-namespace)
    //
    new RegExpForeignCodeExtractor({
      language: 'r',
      pattern: '^%%R( .*?)?\n([^]*)',
      extract_to_foreign: '$2',
      is_standalone: false,
      file_extension: 'R'
    }),
    new RegExpForeignCodeExtractor({
      language: 'r',
      pattern: '(^|\n)%R (.*)\n?',
      extract_to_foreign: '$2',
      is_standalone: false,
      file_extension: 'R'
    }),
    //
    // Standalone IPython magics
    // (script magics are standalone, i.e. consecutive code cells with the same magic create two different namespaces)
    //
    new RegExpForeignCodeExtractor({
      language: 'python',
      pattern: '^%%(python|python2|python3|pypy)( .*?)?\n([^]*)',
      extract_to_foreign: '$3',
      is_standalone: true,
      file_extension: 'py'
    }),
    new RegExpForeignCodeExtractor({
      language: 'perl',
      pattern: '^%%(perl)( .*?)?\n([^]*)',
      extract_to_foreign: '$3',
      is_standalone: true,
      file_extension: 'pl'
    }),
    new RegExpForeignCodeExtractor({
      language: 'ruby',
      pattern: '^%%(ruby)( .*?)?\n([^]*)',
      extract_to_foreign: '$3',
      is_standalone: true,
      file_extension: 'rb'
    }),
    new RegExpForeignCodeExtractor({
      language: 'sh',
      pattern: '^%%(sh|bash)( .*?)?\n([^]*)',
      extract_to_foreign: '$3',
      is_standalone: true,
      file_extension: 'sh'
    }),
    new RegExpForeignCodeExtractor({
      language: 'html',
      pattern: '^%%(html --isolated)( .*?)?\n([^]*)',
      extract_to_foreign: '$3',
      is_standalone: true,
      file_extension: 'html'
    }),
    //
    // IPython magics producing continuous documents (non-standalone):
    //
    new RegExpForeignCodeExtractor({
      language: 'js',
      pattern: '^%%(js|javascript)( .*?)?\n([^]*)',
      extract_to_foreign: '$3',
      is_standalone: false,
      file_extension: 'js'
    }),
    new RegExpForeignCodeExtractor({
      language: 'html',
      pattern: '^%%(html)( .*?)?\n([^]*)',
      extract_to_foreign: '$3',
      is_standalone: false,
      file_extension: 'html'
    }),
    new RegExpForeignCodeExtractor({
      language: 'latex',
      pattern: '^%%(latex)( .*?)?\n([^]*)',
      extract_to_foreign: '$3',
      is_standalone: false,
      file_extension: 'latex'
    }),
    new RegExpForeignCodeExtractor({
      language: 'markdown',
      pattern: '^%%(markdown)( .*?)?\n([^]*)',
      extract_to_foreign: '$3',
      is_standalone: false,
      file_extension: 'md'
    })
  ]
};
