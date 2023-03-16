# `LabIcon` design reference

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
- replaceable
  - all icons can be customized by replacing their svg dynamically during runtime
  - replaceability does not depend on dynamic lookup (you can assign to the `.svgstr` property of any `LabIcon` instance to trigger replacement)
  - whenever its svg is replaced, all visible copies of an icon should immediately rerender
    - implementation, which depends on the method used to render the icon:
      - `LabIcon.element` method
        - find all existing icon nodes by querying on `data-icon-id`
        - directly patch DOM
      - `LabIcon.react` React component
        - emit a signal whenever the icon's svg changes
        - in response, the component does a forced update
    - other possible implementations:
      - observables
      - `MutationObserver`

Design goals for JLIcon (partially implemented):

- remove all other ways of creating icons (though leave an escape hatch)
  - need to deprecate, then later remove, `iconClass` from a number of interfaces
- icon themes
  - sets of replacement icons should be organized as icon themes
  - not sure if icon themes should be independent of main UI theme, or just an optional part of one

Possible design patterns for JLIcon:

1. each icon is a `class`. The icon is used by creating a new instance
1. each icon is a function with methods (ie a callable instance). The icon is used by calling the appropriate method
1. each icon is an instance of a well-defined `class`. The icon is used by calling the appropriate instance method

Patterns 1) and 2) were both initially investigated (see [jupyterlab/jupyterlab#7299](https://github.com/jupyterlab/jupyterlab/pull/7299)). Pattern 3) was found to be easiest to reason about, and had a desirable set of tradeoffs relating to features like dynamic lookup and replaceability (eg you can replace the svg of an icon by just setting the `svgstr` field of the icon instance).

## How icon resolution works

In general, icons in JupyterLab should be consumed either by creating a new instance of `LabIcon`, or by importing an existing one from another file/package. This standard usage pattern does not work with a small set of edge cases. For these cases, it is necessary to dynamically fetch or create an icon. The process by which this occurs is referred to as icon resolution.

For example, in some cases an icon needs to be specified as a string containing the icon's name (eg in one of an extension's JSON-format `.schema` files). So long as the candidate icon meets a certain minimal interface:

```
type IResolvable = string | {name: string, svgstr: string}
```

it can be resolved into an actual `LabIcon` instance by `LabIcon.resolve`. The following is the intended specification for how icon resolution is intended to work:

### cases when resolving `icon: IResolvable` alone

- **case**: `icon` is an instance of `LabIcon`
  - **do**: nothing needs doing, just return `icon`
- **case**: `icon` is an empty string
  - **do**: console error, return `badIcon`
- **case**: `icon` is a non-empty string
  - **do**: assume `icon` is an icon name, attempt lookup in `LabIcon._instances`
    - **case**: lookup succeeds
      - **do**: return the found icon
    - **case**: lookup fails
      - **do**: assume that the icon is correctly specified, but has not yet actually been defined/instantiated anywhere. Create a new icon with params `{name: icon, svgstr: loadingSvgstr}`. Whenever the icon actually does get defined, the loading image will be dynamically replaced with the real one (implemented in `LabIcon.constructor`)
- **case**: `icon` is an object
  - **do**: sanity check `icon`'s params
    - **case**: at least one of `icon.name` or `icon.svgstr` are empty
      - **do**: console error, return `badIcon`
    - **case**: both `icon.name` and `icon.svgstr` are non-empty
      - **do**: assume that `icon` is a definition of a new icon, return `new LabIcon(icon)`

### cases when resolving `icon: IResolvable` and `iconClass: string` together

- **case**: `iconClass` is empty, `icon` is any
  - **do**: resolve as you would `icon` alone
- **case**: `iconClass` is non-empty, `icon` is undefined
  - **do** return just the container with `className` set to `iconClass`
- **case**: `iconClass` is non-empty, `icon` is an object
  - **do**: resolve as you would `icon` alone, but set things up so that on `icon` render, the `className` of the resulting DOM node is set to `iconClass` (for support of icon-as-css-background-image).

### cases when resolving `icon: IResolvable`, `iconClass: string`, and `fallback: LabIcon` all together

- **case**: `iconClass` is empty, `icon` is undefined, `fallback` is defined
  - **do**: return `fallback`
- **case**: anything else
  - **do**: resolve as you would just `icon` and `iconClass` together

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
