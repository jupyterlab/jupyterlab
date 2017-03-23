// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// From https://github.com/webpack/karma-webpack#alternative-usage
// require all modules ending in ".spec" from the
// current directory and all subdirectories
let testsContext = (require as any).context('.', true, /\.spec$/);
testsContext.keys().forEach(testsContext);
