% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

# User Interface Helpers

JupyterLab comes with helpers to show or request simple information from a user.
Those speed up development and ensure a common look and feel.

## Dialogs

### Generic Dialog

To display a generic dialog, use {ts:function}`apputils.showDialog` function from `@jupyterlab/apputils`.

The options available are:

```typescript
showDialog({
  title: 'Dialog title', // Can be text or a react element
  body: 'Dialog body', // Can be text, a widget or a react element
  host: document.body, // Parent element for rendering the dialog
  buttons: [
    // List of buttons
    {
      label: 'my button', // Button label
      caption: 'my button title', // Button title
      className: 'my-button', // Additional button CSS class
      accept: true, // Whether this button will discard or accept the dialog
      displayType: 'default' // applies 'default' or 'warn' styles
    }
  ],
  checkbox: {
    // Optional checkbox in the dialog footer
    label: 'check me', // Checkbox label
    caption: "check me I'magic", // Checkbox title
    className: 'my-checkbox', // Additional checkbox CSS class
    checked: true // Default checkbox state
  },
  defaultButton: 0, // Index of the default button
  focusNodeSelector: '.my-input', // Selector for focussing an input element when dialog opens
  hasClose: false, // Whether to display a close button or not
  renderer: undefined // To define customized dialog structure
});
```

:::{note}
If no options are specified, the dialog will only contain _OK_ and _Cancel_ buttons.
:::

### Message Dialogs

Helper functions to show a message to the user are available in the {ts:module}`apputils` package.
These dialogs return a `Promise` resolving when the user dismisses the dialog.

There is one helper:

- {ts:function}`apputils.showErrorMessage` : show an error message dialog.

### Input Dialogs

Helper functions to request a single input from the user are available in the `apputils`
package within the {ts:namespace}`apputils.InputDialog` namespace. There are four helpers:

- {ts:function}`apputils.InputDialog.getBoolean` : request a boolean through a checkbox.
- {ts:function}`apputils.InputDialog.getItem` : request a item from a list; the list may be editable.
- {ts:function}`apputils.InputDialog.getNumber` : request a number; if the user input is not a valid number, NaN is returned.
- {ts:function}`apputils.InputDialog.getText` : request a short text.
- {ts:function}`apputils.InputDialog.getPassword` : request a short password.

All dialogs are built on the standard {ts:namespace}`apputils.Dialog` namespace using the {ts:class}`apputils.Dialog` class.
Therefore the helper functions each return a `Promise` resolving in a {ts:interface}`apputils.Dialog.IResult` object.

```typescript
// Request a boolean
InputDialog.getBoolean({ title: 'Check or not?' }).then(value => {
  console.log('boolean ' + value.value);
});

// Request a choice from a list
InputDialog.getItem({
  title: 'Pick a choice',
  items: ['1', '2']
}).then(value => {
  console.log('item ' + value.value);
});

// Request a choice from a list or specify your own choice
InputDialog.getItem({
  title: 'Pick a choice or write your own',
  items: ['1', '2'],
  editable: true
}).then(value => {
  console.log('editable item ' + value.value);
});

// Request a number
InputDialog.getNumber({ title: 'How much?' }).then(value => {
  console.log('number ' + value.value);
});

// Request a text
InputDialog.getText({ title: 'Provide a text' }).then(value => {
  console.log('text ' + value.value);
});

// Request a text
InputDialog.getPassword({ title: 'Input password' }).then(value => {
  console.log('A password was input');
});
```

### File Dialogs

Two helper functions to ask a user to open a file or a folder are
available in the {ts:module}`filebrowser` package under the namespace {ts:namespace}`filebrowser.FileDialog`.

Here is an example to request a file.

```typescript
const dialog = FileDialog.getOpenFiles({
  manager, // IDocumentManager
  filter: model => model.type == 'notebook' // optional (model: Contents.IModel) => boolean
});

const result = await dialog;

if (result.button.accept) {
  let files = result.value;
}
```

And for a folder.

```typescript
const dialog = FileDialog.getExistingDirectory({
  manager // IDocumentManager
});

const result = await dialog;

if (result.button.accept) {
  let folders = result.value;
}
```

:::{note}
The document manager can be obtained in a plugin by
requesting {ts:variable}`filebrowser.IFileBrowserFactory` token.
The `manager` will be accessed through
`factory.defaultBrowser.model.manager`.
:::

## Notifications

JupyterLab has a notifications manager that can add, update or dismiss notifications. That feature
is provided by the `@jupyterlab/apputils` package.

:::{warning}
It is a good practice to limit the number of notifications sent to respect the user's focus.
Therefore by default, the notification won't be displayed to the user. But the status bar will
indicate that a new notification arrived. So the user can click on the indicator to see all
notifications.

Try adding a button `Do not show me again` for recurrent notifications to allow users to quickly
filter notifications that matters for them.
:::

A notification is described by the following element:

```typescript
{
  /**
   * Notification message
   *
   * ### Notes
   * Message can only be plain text with a maximum length of 140 characters.
   */
  message: string;
  /**
   * Notification type
   */
  type?:  'info' | 'in-progress' | 'success' | 'warning' | 'error' | 'default';
  /**
   * Notification options
   */
  options?: {
    /**
     * Autoclosing behavior - false (not closing automatically)
     * or number (time in milliseconds before hiding the notification)
     *
     * Set to zero if you want the notification to be retained in the notification
     * center but not displayed as toast. This is the default behavior.
     */
    autoClose?: number | false;
    /**
     * List of associated actions
     */
    actions?: Array<IAction>;
    /**
     * Data associated with a notification
     */
    data?: T;
  };
}
```

At creation, a notification will receive an unique identifier.

Actions can be linked to a notification but the interface depends on how the notification
is handled.

There are two ways of interacting with notifications: through an API or through commands. The only
difference is that actions linked to a notification can have an arbitrary callback when using the API.
But only a command can be set as an action when using the command call for creating a notification.

### Using the API

To create notification, you need to provide a message and you can use the following helpers
to set the type automatically (or use `notify` to set the type manually):

```typescript
/**
 * Helper function to emit an error notification.
 */
Notification.error(message: string, options?: IOptions): string;

/**
 * Helper function to emit an info notification.
 */
Notification.info(message: string, options?: IOptions): string;

/**
 * Helper function to emit a success notification.
 */
Notification.success(message: string, options?: IOptions): string;

/**
 * Helper function to emit a warning notification.
 */
Notification.warning(message: string, options?: IOptions): string;

/**
 * Helper function to emit a in-progress notification. Then
 * it will update it with a error or success notification
 * depending on the promise resolution.
 */
Notification.promise(
  promise: Promise,
  {
    pending: { message: string, options?: IOptions },
    /**
     * If not set `options.data` will be set to the promise result.
     */
    success: { message: (result, data) => string, options?: IOptions },
    /**
     * If not set `options.data` will be set to the promise rejection error.
     */
    error: { message: (reason, data) => string, options?: IOptions }
  }
): string;

/**
 * Helper function to emit a notification.
 */
Notification.emit(
  message: string,
  type: 'info' | 'in-progress' | 'success' | 'warning' | 'error' | 'default' = 'default',
  options?: IOptions
): string;
```

When using the API, an action is defined by:

```typescript
{
  /**
   * The action label.
   *
   * This should be a short description.
   */
  label: string;
  /**
   * Callback function to trigger
   *
   * ### Notes
   * By default execution of the callback will close the toast
   * and dismiss the notification. You can prevent this by calling
   * `event.preventDefault()` in the callback.
   */
  callback: (event: MouseEvent) => void;
  /**
   * The action caption.
   *
   * This can be a longer description of the action.
   */
  caption?: string;
  /**
   * The action display type.
   *
   * This will be used to modify the action button style.
   */
  displayType?: 'default' | 'accent' | 'warn' | 'link';
}
```

You can update a notification using:

```typescript
Notification.update({
  id: string;
  message: string;
  type?:  'info' | 'in-progress' | 'success' | 'warning' | 'error' | 'default';
  autoClose?: number | false;
  actions?: Array<IAction>;
  data?: ReadonlyJsonValue;
}): boolean;
```

:::{note}
Once updated the notification will be moved at the begin of the notification stack.
:::

And you can dismiss a notification (if you provide an `id`) or all
notifications using:

```typescript
Notification.dismiss(id?: string): void;
```

:::{note}
Dismissing a notification will remove it from the list of notifications without
knowing if the user has seen it or not. Therefore it is recommended to not
dismiss a notification.
:::

### Using commands

There are three commands available.

`'apputils:notify'` to create a notification:

```typescript
commands.execute('apputils:notify', {
   message: string;
   type?: 'info' | 'in-progress' | 'success' | 'warning' | 'error' | 'default';
   options?: {
     autoClose?: number | false;
     actions?: Array<IAction>;
     data?: T;
   };
});
```

The result is the notification unique identifier.

An action is defined by:

```typescript
{
  /**
   * The action label.
   *
   * This should be a short description.
   */
  label: string;
  /**
   * Callback command id to trigger
   */
  commandId: string;
  /**
   * Command arguments
   */
  args?: ReadonlyJsonObject;
  /**
   * The action caption.
   *
   * This can be a longer description of the action.
   */
  caption?: string;
  /**
   * The action display type.
   *
   * This will be used to modify the action button style.
   */
  displayType?: 'default' | 'accent' | 'warn' | 'link';
}
```

`'apputils:update-notification'` to update a notification:

```typescript
commands.execute('apputils:update-notification', {
  id: string;
  message: string;
  type?: 'info' | 'in-progress' | 'success' | 'warning' | 'error' | 'default';
  autoClose?: number | false;
  actions?: Array<IAction>;
  data?: T;
});
```

The result is a boolean indicating if the update was successful. In particular,
updating an absent notification will fail.

`'apputils:dismiss-notification'` to dismiss a notification:

```typescript
commands.execute('apputils:dismiss-notification', {
  id: string;
});
```

:::{note}
Dismissing a notification will remove it from the list of notifications without
knowing if the user has seen it or not. Therefore it is recommended to not
dismiss a notification.
:::
