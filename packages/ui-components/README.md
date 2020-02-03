# @jupyterlab/ui-components

A JupyterLab package that provides UI elements of various types (React components, DOM elements, etc) to core JupyterLab packages and third-party extensions.

# `LabIcon` user guide

`LabIcon` is the icon class used by JupyterLab, and is part of the new icon system introduced in JupyterLab v2.0.

## How JupyterLab handles icons

The ui-components package provides icons to the rest of JupyterLab, in the form of a set of `LabIcon` instances (currently about 80). All of the icons in the core JupyterLab packages are rendered using one of these `LabIcon` instances.

## Using the icons in your own code

You can use any of JupyterLab icons in your own code via an `import` statement. For example, to use `jupyterIcon` you would first do:

```
import { jupyterIcon } from "@jupyterlab/ui-components";
```

## How to render an icon into a DOM node

Icons can be added as children to any `div` or `span` nodes using the `icon.element(...)` method (where `icon` is any instance of `LabIcon`). For example, to render the Jupyter icon you could do:

```
jupyterIcon.element({container: elem, height: '16px', width: '16px', marginLeft: '2px'});
```

where `elem` is any `HTMLElement` with a `div` or `span` tag. As shown in the above example, the icon can be styled by passing CSS parameters into `.element(...)`. Any valid CSS parameter can be used (one catch: snake case params do have to be converted to camel case: instead of `foo-bar: '8px'`, you'd need to use `fooBar: '8px'`.

## How to render an icon as a React component

Icons can also be rendered using React. The `icon.react` parameter holds a standard React component that will display the icon on render. Like any React component, `icon.react` can be used in various ways.

For example, here is how you would add the Jupyter icon to the render tree of another React component:

```
  public render() {
    return (
      <div className="outer">
        <div className="inner">
          <jupyterIcon.react tag="span" right="7px" top="5px" />
          "and here's a text node"
        </div>
      </div>
    );
  }
```

Alternatively, you can just render the icon directly into any existing DOM node `elem` by using the `ReactDOM` module:

```
ReactDOM.render(jupyterIcon.react, elem);
```

If do you use `ReactDOM` to render, and if the `elem` node is ever removed from the DOM, you'll first need to clean it up:

```
ReactDOM.unmountComponentAtNode(elem);
```

This cleanup step is not a special property of `LabIcon`, but is instead needed for any React component that is rendered directly at the top level by `ReactDOM`: failure to call `unmountComponentAtNode` can result in a [memory leak](https://stackoverflow.com/a/48198011/425458).
