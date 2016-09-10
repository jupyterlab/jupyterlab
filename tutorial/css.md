# CSS Patterns

This document describes the patterns we are using to organize and write
CSS for JupyterLab.

## CSS Variables

We are using CSS Variables for theming because we can change them at runtime in the browser without having to re-compile CSS in the browser/server. This enables third party plugins to style themselves using the currently active theme.

However, single pass CSS processors such as cssnext or myth will help us cover situations where CSS variable are not supported.

## File organization

We are organizing our CSS files in the following manner:

* Each plugin/subdirectory in the top-level `src` has its own local CSS file,
with a preference of one CSS file per source file that it themes and a single
`index.css` file.
* Each plugin should be imported in `src/default-theme/index.css`.
* These files should use the variables in `src/default-theme/variables.css`
  and style themselves appropriately.
* Public CSS Variables should use the `jp-` prefix and private ones should use the `jp-private-` prefix.


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

Fourth, some CSS classes are used to modify the state of a widget:

* `jp-mod-active`: applied to elements in the active state
* `jp-mod-hover`: applied to elements in the hover state
* `jp-mod-selected`: applied to elements while selected
