# CSS Patterns

This document describes the patterns we are using to organize and write
CSS for JupyterLab.

## Less

For now we are using [Less]() as a CSS preprocessor. We are actively
investigating other preprocessors, but are using Less for now because:

* It is familiar as we are using it in the classic notebook.
* It is relatively simple and stable.
* It is implemented as a pure JavaScript library that works on both
  the server and client side.

## File organization

We are organizing our CSS files in the following manner:

* Each plugin/subdirectory in the top-level `src` directory may have a
  `base.less` file that contains the structural CSS required for the 
  plugin to work at a basic level:
  - Properties that affect layout such as width, height, padding,
    margins, border, width.
  - Font size, line heights, letter spacing
  - The only colors that should be used in the `base.less` files are
    black and white.
* The `base.less` files of each plugin get bundled together in
  `src/basestyle`.
* The `base.less` files can use the variables in `src/basestyle/variables.less`.
* Each plugin should have a theme style file in `src/default-theme`.
* These files should use the variables in `src/default-theme/variables.less`
  and style themselves appropriately.

## CSS class names

We have a fairly formal method for naming our CSS classes.

First, CSS class names are associated with TypeScript classes that extend
`phosphor.Widget`:

The `.node` of each such widget should have a CSS class that matches
the name of the TypeScript class:

```TypeScript
class MyWidget extends Widget {

  constructor() {
    super();
    this.addClass('jp-MyWidget');
  }

}
```

Second, subclasses should have a CSS class for both the parent and child:

```TypeScript
class MyWidgetSubclass extends MyWidget {

  constructor() {
    super(); // Adds `jp-MyWidget`
    this.addClass('jp-MyWidgetSubclass');
  }

}
```

Third, children nodes of a `Widget` should have a third segment in the CSS
class name that gives a semantic naming of the component, such as:

* `jp-MyWidget-toolbar`
* `jp-MyWidget-button`
* `jp-MyWidget-contentButton`

Thus, the general naming of CSS classes is of the form
`jp-WidgetName-semanticChild`.

Forth, some CSS classes are used to modify the state of a widget:

* `jp-mod-active`: applied to elements in the active state
* `jp-mod-hover`: applied to elements in the hover state
* `jp-mod-selected`: applied to elements while selected
