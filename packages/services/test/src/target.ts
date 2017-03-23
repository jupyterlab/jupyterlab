// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Stub for requirejs define
declare var define: any;


define(() => {
  let myModule = {
    test: () => { return 1; },
    test2: () => { throw Error('Nope'); }
  };
  return myModule;
});
