# @jupyterlab/ui

A JupyterLab package that provides React UI components to core JupyterLab packages and third-party extensions.

## Components

### Button

#### Usage

```ts
import { Button } from '@jupyterlab/ui';

const MyButton = (props) => (
  <Button onClick={props.handleClick}>
    Click me!
  </Button>
);
```

#### Props

| Name | Description | Type | Default value | Required |
|------|-------------|------|---------------| -------- |
| className | CSS class name(s) | `string` | `''` | `false` |
| onClick | Click event handler | `(event: React.MouseEvent<HTMLElement>) => void` | `undefined` | `false` |
| tooltip | Tooltip to display on hover | `string` | `undefined` | `false` |

### Select

#### Usage

```ts
import { Select } from '@jupyterlab/ui';

<Select
  onChange={this.handleChange}
  options={this.state.options}
  selected={this.state.selected}
/>
```

#### Props


| Name | Description | Type | Default value | Required |
|------|-------------|------|---------------| -------- |
| className | CSS class name(s) | `string` | `''` | `false` |
| onChange | Change event handler | `(event: React.ChangeEvent<HTMLSelectElement>) => void` | `undefined` | `false` |
| options | Array of select options | `string[]` | `undefined` | `false` |
| selected | Default selected option | `string` | `undefined` | `false` |