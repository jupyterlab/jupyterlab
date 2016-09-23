/// <reference path="../typings/ansi_up/ansi_up.d.ts"/>
/// <reference path="../typings/bokeh/bokeh.d.ts"/>
/// <reference path="../typings/codemirror/codemirror.d.ts"/>
/// <reference path="../typings/xterm/xterm.d.ts"/>

/*
 * TODO: remove the below typings after typedoc understands the lib compiler option
 * and the @types typing resolution.
 * When this happens, use the typescript compiler option:
 * "lib": ["dom", "es5", "es2015.promise", "es2015.collection"],
 */
/// <reference path="../node_modules/@types/requirejs/index.d.ts"/>
/// <reference path="../node_modules/@types/mathjax/index.d.ts"/>
/// <reference path="../node_modules/typescript/lib/lib.es2015.promise.d.ts"/>
/// <reference path="../node_modules/typescript/lib/lib.dom.d.ts"/>
/// <reference path="../node_modules/typescript/lib/lib.es5.d.ts"/>
/// <reference path="../node_modules/typescript/lib/lib.es2015.collection.d.ts"/>

// For a Thenable reference in jupyter-js-services
type Thenable<T> = Promise<T>
