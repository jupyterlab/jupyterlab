// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  editorServices
} from '../../../lib/codemirror';

import {
  ConsoleContent
} from '../../../lib/console';


/**
 * Create a console renderer.
 */
export
function createRenderer(): ConsoleContent.Renderer {
  return new ConsoleContent.Renderer({ editorServices });
}
