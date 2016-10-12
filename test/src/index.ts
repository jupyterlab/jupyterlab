// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'phosphor/styles/base.css';


// Require all spec files
// From https://webpack.github.io/docs/context.html#context-module-api
let context = (require as any).context('./', true, /^.*?\.spec\.ts$/);
context.keys.map(context);
