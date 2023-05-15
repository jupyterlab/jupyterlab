/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module markedparser-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { IMarkdownParser } from '@jupyterlab/rendermime';
import { marked } from 'marked';

/**
 * The markdown parser plugin.
 */
const plugin: JupyterFrontEndPlugin<IMarkdownParser> = {
  id: '@jupyterlab/markedparser-extension:plugin',
  description: 'Provides the Markdown parser.',
  autoStart: true,
  provides: IMarkdownParser,
  requires: [IEditorLanguageRegistry],
  activate: (app: JupyterFrontEnd, languages: IEditorLanguageRegistry) => {
    Private.initializeMarked(languages);
    return {
      render: (content: string): Promise<string> =>
        new Promise<string>((resolve, reject) => {
          marked(content, (err: any, content: string) => {
            if (err) {
              reject(err);
            } else {
              resolve(content);
            }
          });
        })
    };
  }
};

/**
 * Export the plugin as default.
 */
export default plugin;

namespace Private {
  let markedInitialized = false;
  export function initializeMarked(languages: IEditorLanguageRegistry): void {
    if (markedInitialized) {
      return;
    } else {
      markedInitialized = true;
    }

    marked.setOptions({
      gfm: true,
      sanitize: false,
      // breaks: true; We can't use GFM breaks as it causes problems with tables
      langPrefix: `language-`,
      highlight: (code, lang, callback) => {
        const cb = (err: Error | null, code: string) => {
          if (callback) {
            callback(err, code);
          }
          return code;
        };
        if (!lang) {
          // no language, no highlight
          return cb(null, code);
        }
        const el = document.createElement('div');
        try {
          languages
            .highlight(code, languages.findBest(lang), el)
            .then(() => {
              return cb(null, el.innerHTML);
            })
            .catch(reason => {
              return cb(reason, code);
            });
        } catch (err) {
          console.error(`Failed to highlight ${lang} code`, err);
          return cb(err, code);
        }
      }
    });
  }
}
