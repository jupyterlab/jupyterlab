/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

/**
 * The interface for providing custom language settings.
 */
export
interface LanguageSettings {
  /**
   * The human readable name for this language.
   */
  name: string;
  /**
   * The default number of spaces to be used for a tab.
   */
  tabSize: number;
  /**
   * The file extension to associate with this language.
   */
  fileExtension: string;
}

export
const PYTHON = {
  name: 'Python',
  tabSize: 4,
  fileExtension: '.py'
};

export
const JAVASCRIPT = {
  name: 'Javascript',
  tabSize: 2,
  fileExtension: '.js'
};

export
const TYPESCRIPT = {
  name: 'TypeScript',
  tabSize: 2,
  fileExtension: '.ts'
};
