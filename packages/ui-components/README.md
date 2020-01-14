# @jupyterlab/ui-components

A JupyterLab package that provides UI elements of various types (React components, DOM elements, etc) to core JupyterLab packages and third-party extensions.

# Icon notes

## Icon sourcing notes

The following icons were originally taken from a set of material design icons:

- `filetype/folder.svg`
  - originally `ic_folder_24px.svg`
- `sidebar/build.svg`
  - originally `ic_build_24px.svg`
- `sidebar/extension.svg`
  - originally `ic_extension_24px.svg`
- `sidebar/palette.svg`
  - originally `ic_palette_24px.svg`
- `sidebar/tab.svg`
  - originally `ic_tab_24px.svg`
- `statusbar/kernel.svg`
  - originally `ic_memory_24px.svg`

## Icon usage notes

The icons are organized into various categories in `./style/icons`, based on where/how they are used in Jupyterlab core. Some icons fall into multiple categories, and are noted here:

- `filetype/file.svg`
  - filetype
  - settingeditor
- `filetype/folder.svg`
  - breadcrumb
  - filetype
  - sidebar
- `filetype/markdown.svg`
  - filetype
  - settingeditor
- `filetype/notebook.svg`
  - filetype
  - launcher
  - settingeditor
- `statusbar/terminal.svg`
  - launcher
  - statusbar
  - settingeditor

## Notes on design of JLIcon

Design goals for JLIcon (already implemented):

- the one true icon
  - create a single, canonical, simple (as possible) way to set up and use icons in jlab
- every icon is a symbol
  - each icon is defined exactly once, and is thereafter referred to via a unique symbol
  - to use an icon `fooIcon` outside of the file in which it is defined, the pattern will be to import `fooIcon`
  - this enables compile-time checking; helps to ensure that icons are specified correctly when used (as opposed to the old pattern of specifying icon via a `string` with name or className)
- every icon is flexible
  - can used in any context in which icons are used in jlab
    - every icon can be passed into Lumino
    - every icon can create a DOM node
    - every icon can create a React component
- dynamic lookup (for when absolutely needed)
  - Use dynamic lookup for the few cases in which an icon can only be specified as a string (such as in json schema files)
  - In all other cases, force (or at least strongly encourage) the pattern of import-icon
- reusable
  - every defined icon can be used any number of times in any set of contexts
  - where an icon is defined should not matter; all icons defined in core and extensions are reusable in any other extension

Design goals for JLIcon (partially implemented):

- remove all other ways of creating icons (though leave an escape hatch)
  - need to deprecate, then later remove, `iconClass` from a number of interfaces
- replacable
  - all icons can be customized by replacing their svg dynamically during runtime
    - currently, I'm leaning towards the idea that icon replacements should be an (optional) part of a theme
  - ideally, replacability will not depend on dynamic lookup
  - whenever its svg is replaced, all visible copies of an icon should immediately rerender
    - possible implementations:
      - signals
      - observables
      - `MutationObserver`

Possible design patterns for JLIcon:

1. each icon is a `class`. The icon is used by creating a new instance
2. each icon is a function with methods (ie a callable instance). The icon is used by calling the appropriate method
3. each icon is an instance of a well-defined `class`. The icon is used by calling the appropriate instance method

Patterns 1) and 2) were both initially investigated (see [jupyterlab/jupyterlab#7299](https://github.com/jupyterlab/jupyterlab/pull/7299)). Pattern 3) was found to be easiest to reason about, and had a desirable set of tradeoffs relating to features like dynamic lookup and replacability (eg you can replace the svg of an icon by just setting the `svgstr` field of the icon instance).
