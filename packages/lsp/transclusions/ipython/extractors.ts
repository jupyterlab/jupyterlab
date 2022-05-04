import { RegExpForeignCodeExtractor } from '../../extractors/regexp';
import { IForeignCodeExtractorsRegistry } from '../../extractors/types';

export let foreign_code_extractors: IForeignCodeExtractorsRegistry = {
  // general note: to match new lines use [^] instead of dot, unless the target is ES2018, then use /s
  python: [
    //
    // Standalone IPython magics
    // (script magics are standalone, i.e. consecutive code cells with the same magic create two different namespaces)
    //
    new RegExpForeignCodeExtractor({
      language: 'python',
      pattern: '^%%(python|python2|python3|pypy)( .*?)?\n([^]*)',
      foreign_capture_groups: [3],
      is_standalone: true,
      file_extension: 'py'
    }),
    new RegExpForeignCodeExtractor({
      language: 'perl',
      pattern: '^%%(perl)( .*?)?\n([^]*)',
      foreign_capture_groups: [3],
      is_standalone: true,
      file_extension: 'pl'
    }),
    new RegExpForeignCodeExtractor({
      language: 'ruby',
      pattern: '^%%(ruby)( .*?)?\n([^]*)',
      foreign_capture_groups: [3],
      is_standalone: true,
      file_extension: 'rb'
    }),
    new RegExpForeignCodeExtractor({
      language: 'sh',
      pattern: '^%%(sh|bash)( .*?)?\n([^]*)',
      foreign_capture_groups: [3],
      is_standalone: true,
      file_extension: 'sh'
    }),
    new RegExpForeignCodeExtractor({
      language: 'html',
      pattern: '^%%(html --isolated)( .*?)?\n([^]*)',
      foreign_capture_groups: [3],
      is_standalone: true,
      file_extension: 'html'
    }),
    //
    // IPython magics producing continuous documents (non-standalone):
    //
    new RegExpForeignCodeExtractor({
      language: 'javascript',
      pattern: '^%%(js|javascript)( .*?)?\n([^]*)',
      foreign_capture_groups: [3],
      is_standalone: false,
      file_extension: 'js'
    }),
    new RegExpForeignCodeExtractor({
      language: 'html',
      pattern: '^%%(?!html --isolated)(html)( .*?)?\n([^]*)',
      foreign_capture_groups: [3],
      is_standalone: false,
      file_extension: 'html'
    }),
    new RegExpForeignCodeExtractor({
      language: 'latex',
      pattern: '^%%(latex)( .*?)?\n([^]*)',
      foreign_capture_groups: [3],
      is_standalone: false,
      file_extension: 'tex'
    }),
    new RegExpForeignCodeExtractor({
      language: 'markdown',
      pattern: '^%%(markdown)( .*?)?\n([^]*)',
      foreign_capture_groups: [3],
      is_standalone: false,
      file_extension: 'md'
    })
  ]
};
