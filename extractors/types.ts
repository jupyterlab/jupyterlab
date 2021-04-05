import { CodeEditor } from '@jupyterlab/codeeditor';

import { LanguageIdentifier } from '../lsp';

export interface IExtractedCode {
  /**
   * Foreign code (may be empty, for example line of '%R') or null if none.
   */
  foreign_code: string | null;
  /**
   * Range of the foreign code relative to the original source.
   */
  range: CodeEditor.IRange;
  /**
   * Shift due to any additional code inserted at the beginning of the virtual document
   * (usually in order to mock the arguments passed to a magic, or to provide other context clues for the linters)
   */
  virtual_shift: CodeEditor.IPosition | null;
  /**
   * Code to be retained in the virtual document of the host.
   */
  host_code: string | null;
}

/**
 * Foreign code extractor makes it possible to analyze code of language X embedded in code (or notebook) of language Y.
 *
 * The typical examples are:
 *  - (X=CSS< Y=HTML), or
 *  - (X=JavaScript, Y=HTML),
 *
 * while in the data analysis realm, examples include:
 *   - (X=R, Y=IPython),
 *   - (X=LATEX Y=IPython),
 *   - (X=SQL, Y=IPython)
 *
 * This extension does not aim to provide comprehensive abilities for foreign code extraction,
 * but it does intend to provide stable interface for other extensions to build on it.
 *
 * A simple, regular expression based, configurable foreign extractor is implemented
 * to provide a good reference and a good initial experience for the users.
 */
export interface IForeignCodeExtractor {
  /**
   * The foreign language.
   */
  language: LanguageIdentifier;

  /**
   * Split the code into the host and foreign code (if any foreign code was detected)
   */
  extract_foreign_code(code: string): IExtractedCode[];
  /**
   * Does the extractor produce code which should be appended to the previously established virtual document (False)
   * of the same language, or does it produce standalone snippets which require separate connections (True)?
   */
  standalone: boolean;
  /**
   * Test if there is any foreign code in provided code snippet.
   */
  has_foreign_code(code: string): boolean;
  /**
   * Extension of the virtual document (some servers check extensions of files), e.g. 'py' or 'R'.
   */
  file_extension: string;
}

export interface IForeignCodeExtractorsRegistry {
  [host_language: string]: IForeignCodeExtractor[];
}
