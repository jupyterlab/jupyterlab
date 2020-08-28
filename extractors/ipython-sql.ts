import { IForeignCodeExtractorsRegistry } from './types';
import { RegExpForeignCodeExtractor } from './regexp';
import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { ILSPCodeExtractorsManager, PLUGIN_ID } from '../tokens';

export const SQL_URL_PATTERN = '(?:(?:.*?)://(?:.*))';
// note: -a/--connection_arguments and -f/--file are not supported yet
const single_argument_options = [
  '-x',
  '--close',
  '-c',
  '--creator',
  '-p',
  '--persist',
  '--append'
];
const zero_argument_options = ['-l', '--connections'];

const COMMAND_PATTERN =
  '(?:' +
  (zero_argument_options.join('|') +
    '|' +
    single_argument_options.map(command => command + ' \\w+').join('|')) +
  ')';

export let foreign_code_extractors: IForeignCodeExtractorsRegistry = {
  // general note: to match new lines use [^] instead of dot, unless the target is ES2018, then use /s
  python: [
    new RegExpForeignCodeExtractor({
      language: 'sql',
      pattern: `^%%sql(?: (?:${SQL_URL_PATTERN}|${COMMAND_PATTERN}|(?:\\w+ << )|(?:\\w+@\\w+)))?\n?(.+\n)?([^]*)`,
      extract_to_foreign: '$1$2',
      is_standalone: true,
      file_extension: 'sql'
    }),
    new RegExpForeignCodeExtractor({
      language: 'sql',
      pattern: `(?:^|\n)%sql (?:${SQL_URL_PATTERN}|${COMMAND_PATTERN}|(.*))\n?`,
      extract_to_foreign: '$1',
      is_standalone: false,
      file_extension: 'sql'
    })
  ]
};

/**
 * Implements extraction of code for ipython-sql, see:
 * https://github.com/catherinedevlin/ipython-sql
 */
export const IPYTHON_SQL_CODE_EXTRACTORS: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ':extractors-ipython-sql',
  requires: [ILSPCodeExtractorsManager],
  activate: (app, extractors_manager: ILSPCodeExtractorsManager) => {
    for (let language of Object.keys(foreign_code_extractors)) {
      for (let extractor of foreign_code_extractors[language]) {
        extractors_manager.register(extractor, language);
      }
    }
  },
  autoStart: true
};
