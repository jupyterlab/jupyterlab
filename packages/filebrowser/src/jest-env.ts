/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// From: https://github.com/jsdom/jsdom/issues/1724#issuecomment-1446858041
// Mostly the same as in @jupyterlab/testing, but using jsdom version of `File`
// so that it is compatible with `FileReader` from jsdom.

import JSDOMEnvironment from 'jest-environment-jsdom';

export default class FixJSDOMEnvironment extends JSDOMEnvironment {
  constructor(...args: ConstructorParameters<typeof JSDOMEnvironment>) {
    super(...args);

    this.global.fetch = fetch;
    this.global.Headers = Headers;
    this.global.Request = Request;
    this.global.Response = Response;
  }
}
