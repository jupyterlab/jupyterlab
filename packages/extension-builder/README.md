# JupyterLab Extension Builder

**Tools for building JupyterLab extensions**

A JupyterLab extension provides additional, optional functionality to 
JupyterLab's built-in capabilities. An extension is a module that provides 
one or more plugins to the JupyterLab application. To streamline third-party 
development of extensions, this library provides a build script for generating 
third party extension JavaScript bundles.  

Simple extensions can be created by using the `buildExtension` function
with the default options.  More advanced extensions may require additional
configuration such as custom loaders or WebPack plugins.

A video tutorial walkthrough for building JupyterLab extensions can be found on [YouTube](https://youtu.be/WVDCMIQ3KOk).


## Package Install

**Prerequisites**
- [node](http://nodejs.org/)

```bash
npm install --save @jupyterlab/extension-builder
```


## Source Build

**Prerequisites**
- [git](http://git-scm.com/)
- [node 4+](http://nodejs.org/)

```bash
git clone https://github.com/jupyterlab/jupyterlab.git
cd jupyterlab
npm install
npm run build
cd packages/extension-builder
```


### Rebuild Source

```bash
npm run clean
npm run build
```

### Debugging

```
npm install -g devtool
```

Insert a `debugger;` statement in the source where you want the execution to
stop in the debugger. Then execute an extension build with

```
devtool <my_build_script.js>
```

or if running WebPack directly,

```
devtool <path_to_webpack_in_node_modules/bin>
```

## Usage

Three major usage steps include:
- creating the [extension entry point](#extension-entry-point)
- build using the [buildExtension](#buildExtension) script
- register the extension using [`jupyter labextension`](#jupyter-labextension)

The full API docs can be found [here](http://jupyterlab.github.io/jupyterlab/).

### Extension entry point
A simple extension entry point that exposes a single application [plugin](http://jupyterlab-tutorial.readthedocs.io/en/latest/plugins.html) could 
look like: 

```javascript
module.exports = [{
    id: 'my-cool-extension',
    activate: function(app) {
       console.log(app.commands);
    }
}];
```

The extension entry point *must* be a CommonJS module where the default
export is an array of plugin objects.  If writing in ES6 format use the default
export syntax `export default myPlugin` for a single plugin, and the following 
pattern for multiple exports  (remove the type declaration if not using 
TypeScript):

```typescript
import { JupyterLabPlugin } from 'jupyterlab/lib/application';
// Plugins defined here
const plugins: JupyterlabPlugin<any>[] = [ ... ];
export default plugins;
```


### buildExtension
Build the above example using the following script:

```javascript
var buildExtension = require('@jupyterlab/extension-builder').buildExtension;

buildExtension({
    name: 'my-cool-extension',
    entry: './index.js',
    outputDir: './build'
});
```
The `name` is a string that will be used for the output filename. The `entry` is the module that exports a plugin definition or array of plugin definitions. The `outputDir` is the directory in which the generated plugin bundle, manifest, and related files will be stored.

Several optional arguments are also available; see the options at the bottom of the [builder.ts](https://github.com/jupyter/jupyterlab-extension-builder/blob/master/src/builder.ts) file.

In this case the builder script will create the following files in the build
directory:

```
my-cool-extension.bundle.js
my-cool-extension.js.manifest
```

### jupyter labextension
Other extensions may produce additional files in the build directory depending
on the complexity of extension.  The two files above, `my-cool-extension.js` and
`my-cool-extension.js.manifest`, are used by the JupyterLab server to determine
the entry point file(s) and entry point module(s) for the extension.  The
extension must also be registered, using the command `jupyter labextension`, in
order to be added to the JupyterLab application.  See the documentation for
[labextension](http://jupyterlab-tutorial.readthedocs.io/en/latest/labextensions.html)


## Technical overview

The extension bundles are created using WebPack, and the modules produced by
WebPack are modified to use JupyterLab's custom module registration and loading
mechanism.

JupyterLab's custom module registration and loading mechanism uses a `define`
function that registers modules by name, where the name contains the package
name, version number, and the full path to the module.  For example,
`'phosphor@0.6.1/lib/ui/widget.js'`.  Within a `define` function, a required
module is referenced by package name, semver range, and the full path to the
module.  For example, `require('phosphor@^0.6.0/lib/ui/tabpanel.js')`. The
semver range is determined by the following criteria (see the
`getModuleSemverPath` function in `plugin.ts`:

1. If the dependency is in the same package, the exact version of the dependency
   is used.
2. If the dependency is a local package (i.e., module given by `file://...`),
   the semver is the patch-level range (`~`) starting from the installed
   version.
3. If the dependency is in the dependency list of the module's `package.json`,
   then the semver range requested there is used.
4. Otherwise the installed version of the dependency is used exactly. Note that
   not listing an external dependency in the package metadata is a bad practice
   that leads to almost no deduping.

By using a semver range, JupyterLab can perform client-side deduplication of
modules, where the registered module that maximally satisfies a semver range is
the one returned by the `require` function call.  This also enables us to
perform server-side deduplication of modules prior to serving the bundles, and
the client-side lookup will still load the correct modules.

Reasons to deduplicate code include:

- being able to use `instanceof()` on an object to determine if it is the same class (a technique used by phosphor's drag-drop mechanism)
- sharing of module-private state between different consumers, such as a list of client-side running kernels in `@jupyterlab/services`.

All client-side `require()` calls are synchronous, which means that the bundles
containing the `define()` modules must be loaded prior to using any of the
bundles' functions.  The [loader](http://jupyterlab.github.io/jupyterlab/classes/_application_loader_.moduleloader.html) in JupyterLab provides an `ensureBundle()` 
function to load a particular bundle or bundles prior to calling `require()` 
on a module.

### Custom WebPack Configuration and JupyterLabPlugin
A completely custom WebPack configuration may be needed if there is a case where
the `buildExtension` function is not sufficient to build the extension. If a
custom WebPack configuration is needed, the `JupyterLabPlugin` must be used as
part of the WebPack config to ensure proper handling of module definition and
requires.


## Publishing your extension
Before you publish your extension to `npm`, add the following `keywords` attribute to your extension's `package.json`:
```
{
    "keywords": ["jupyterlab", "jupyterlab extension"],
    ...
}
```
Adding these keywords will allow other users to discover your extension with `npm search`.
