// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from '@phosphor/coreutils';


/* tslint:disable */
/**
 * The path tracker token.
 */
export
const IFileBrowserFactory = new Token<IFileBrowserFactory>('jupyter.services.file-browser');
/* tslint:enable */


/**
 * The file browser factory interface.
 */
export
interface IFileBrowserFactory {
  /* */
}
