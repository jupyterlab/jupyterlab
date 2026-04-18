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

### Dialog Button Helpers and Defaults

Use the {ts:namespace}`apputils.Dialog` helpers from {ts:module}`apputils` to
get consistent labels, styling and behavior:

- {ts:function}`apputils.Dialog.okButton`: creates an accept button (`accept: true`) with a default localized `Ok` label.
- {ts:function}`apputils.Dialog.cancelButton`: creates a reject button (`accept: false`) with a default localized `Cancel` label.
- {ts:function}`apputils.Dialog.warnButton`: creates a warning-styled button (`displayType: 'warn'`); acceptance and label still follow {ts:function}`apputils.Dialog.createButton`.
- {ts:function}`apputils.Dialog.createButton`: generic helper; if `accept` is omitted it defaults to `true`, and the default label is `Ok` for accept buttons and `Cancel` otherwise.

You only need to provide `label` when you want custom text.

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

:::{note}
Try these helpers in a browser playground:

1. Click **Load Interactive Example**.
2. In the playground editor toolbar (or command palette), run `Load Current File As Extension`.
3. Use the **UI Helpers Playground** panel buttons to preview dialogs, notifications, and file dialogs.
   :::

```{raw} html
<div class="jp-plugin-playground-embed" data-playground-mode="simple">
  <p class="jp-plugin-playground-description">
    Interactive dialogs + notifications example.
  </p>
  <div class="jp-plugin-playground-actions">
    <button type="button" class="jp-plugin-playground-load">
      Load Interactive Example
    </button>
    <a class="jp-plugin-playground-open" href="https://jupyterlab-plugin-playground.readthedocs.io/en/latest/lite/lab/index.html?plugin=1.g.H4sIAAb822kC_81Z_2_bNhb_V7hgmOTCVpLedgeoa3dpkqI5ZFvQpLcfmgKjJdrmQpEaSTk2Mv_v9_hFFvXFqZvLAQcUtSI-ft7j-_6oh4MlkYoKfpAejw9mlJFfcEEO0gPKc7JKtDoYHyhRycy-K0ohNXpA_6rKtSbynRRcn_N83H1xxao55WiDZlIUKPrnH26Z4ekhLktGM6yBZfTqlt_yGvSWI3RGMRPzsXm8OBVFgQEKM6I1ce94WemA5mdM-Ykk-Deaz4m2r34Rms48vn2hFuLebbnlO-SpNGWqLQx6B5rwnNCF-eOtFPcKTogzLeR68GhGe1NH1kFzAjabWFVQLg7v7WvPOhNcaWTUsz4vpiS_xGtRafQaYbXmGYrNYWA17SnfLIjSHFilTo0ILWhO3hOcE_lTiqZCMIL5q2bpksz04MIHOl8Mr1xrrCv1FncBNyDhw-aWj1J0BYejivy4FDR_g16_ccK4c_Xkgm1aVs6ujVD9t1ai_uutOH6pFsUrwmq05i0r3lajWbDOlSKlJeVzD4zlXMHxHtCnO7Ku1z6nqOJ3XNyDPxuynQdFiM5Q_A3YKPHwKllg5f049u9Go5oaIUl0JWslb9yPBufaEhhAI1SwB6S8x9Q6SsOGrEhWaVLzGNuTjF7VezaIMEW-DiPY7eVDEFXZokE5fFGrERV4jbjQaEoQXmIKwcAIggSAGUMLASZQC8KYQi8Og7NuvJGcLGCkOAqSQ6qInhQiJ9EYDGIeUhQpsAcjk1xkVUG4jtBm1LJ0JhjDpSIXs39TRY0QW7t3LP4_tqI1XAhB1Y2Yg-yDCI0GOspv6clg1nGy3ey29s7dVqW2rCcMNk4w5MvI4W9CVBtnT4KVZudOXBftTwJe2K1DoNvo_zKusqRTLD1qA7cJ0m5pC1Y6XMdqD3G8KPhQVFGQjpVQOic5KUTq9kc2j-BKCxBQ6rRJWpL8WVFJIEF_6ha2ofLy2QFlmi6xBsf3WWtn-keodGjpYN1EaNqCT4d42twWhIFTTG5roMcEFfRO7giiV-Emaur0I3vsensLD-r2IztDsjaAKAlvivYjEKZKT5zUE7NpAEYw8LuvAprZLX2oK8wJewTD0ExKQxT5KA-KlpOgSWGhdWqPb9qbOEjvmmpm8uXHC_TesUNnwC4aNyRTkYMfRDcLqryRETwZOO66FMzBjuBo1gsJqnOuVT0iK1yUjCQtxEpr24N8cgIlGeYZYW_t63g09t1dIu78qwcEhYIwkOJaVJAk0VyI3OT0z9vSs02Efe3YZnCXcjwVURWzNFZXQfuYQN91Q1Z6SGm_LbDVa8VypBek5ZpI4fVPUUu8sFY7honTRIKzjJQaffedFyRZYlaRVi0P29WE8pmIQ1JT-Uw2OWVCgWR_Ozo6alTSFOa-bkJYOH5HOS2mqgIplYqdJ8A_jPyr9sGtTxh1gCOAx4A3JaYyBy1FW9B9TPirj1n1uKcPGrOJdWPLLVJoUAg6PCcy7WS_JCczDFA-_SWmt2CJJ-6JvduwXzDk79eEkUyTHH37EBo1YYTP9WKDqCZFrEbJ7y017lQk2s_0v3YS2H-h1PMVVRp6pTOoXFZz_4_KdZk3BSVf28auFUCjzbMoFyopskk67YycP7qfN-gvxCvodV_bn45RMiDX5CQz0rvMZ0KyZuZTYGsOcaUfGiFvtHan-hcyv44S2tj3Nz9fOthzRkyGHjDztGZbZ_HECeV3xJEjiBodeGPodWl66Hq9twwp9BT6EMvVHaVLovQa6kSJ8xzOZ6COku8lKdBR8o8f4Dcapp8K6WbE6LhcISUYzdESy3gy-aOcuMUJNHtCvhw9ivAB57RSBufv5WoXJc7u5tJUIEO35cLs_O24HO_iklVSCStnKWy17NHBwc-XoJ9LiCXCiYyjDPrcO8idnYBE1qy1rRNwY8GWJHaeEI9GiR2_YiKlYfim7dbGzDCTJ3bV0TS27IWQo4pMS-A9Dc1gaiO5TelhjHzfKTntOGke3Qzkz7wj4ROuKklsR2Rr0s5gCg9n8oMNPVNGv7FPMEudUVWCfHkrS3gZLE0Yy-1QyLbuysm9v5iJm4PUDayW4pFwKYNIsbTtSGhkij7C3A1VE_737RHSApWSLClwd32XGrcqLfxpmkXTXdYESdTh5pyvgCmfchtT6KgOKHQUhYcxAiUcknA_EI9b4deihUGD8Px0QVkeW45ho-MvqqzfqEeUlNNloCZP78XIwYAQYEaMuaR5tIPMrN0Q6DQB91SwqrAMI0lK4BQbP53MqB6jgvICr-KXL4_K1Rgdz-RotBMSly4L1dmnSxaevZ-64-gaWmTfykK0bNv0Uf-oX0I6UXfoHQSzaUQdlO1Qn4BkZQpD3MGFb56AaloJ2xKo1nk7XduTgW3h7iMHvcuo43bDDuq5hrSlTzImxNtJBoaOOgME6cvnlcERbTudhaR2VkhswTN7gjnrCtzaVZPhPRkkVuxupsztQDeDhtmrSaCtqySI4Po2qjWdB51OPVd15r8UtZy3pvY3f2njzJ7_6IsChJP-PvzbLj8kgA2BvfkPXBvsI4YNjPWwAGHQ7C3H4O3DPpIMxNiQUJ2Y-zq5-tcZ-0vWDtKdogUsvkq28H5kb6GaEEN2_4Bcvd7KFS33wQVCL-hF4rC7sXe_jgrajBOtcbbotBnuQPZC25wmdtRjFBWQaKJWqxQMx80Wf6n3dn1R74XE0x8-Gv35qz3D7MKMjA_N14u-CsFvydxe8ZnWQ6IL05TOcEZqRUZN3nsEuJNYngm1nS2eCXQwBTwT9o6wfk70oeDcF99xODxEJ-arIcIGugQHAzeWuCDQZwrbRpp-0jCz9zdlEz2uLrVubpX99piT_Mxc82w7WVNIP364vCZYZosrDOgKnJfn4j5hor5Jsosjc3MQR8TARBCFr02n2fRZdsYx0QDzjRaS5DWHBGTj8eBVhQvLtmjdkKy_Z7U-nppPMLsCcvcHsG5QhQPPVlo3jPUEPXwB_jgR5fZL13ZK2n5wICv7Udjfk_gvD7BysPkPQVvnW4wfAAA" target="_blank" rel="noopener noreferrer" title="Open full JupyterLab view in a new tab">
      JupyterLab <i class="fa fa-external-link" aria-hidden="true"></i>
    </a>
    <a href="https://jupyterlab-plugin-playground.readthedocs.io/en/latest/lite/tree/index.html?plugin=1.g.H4sIAAb822kC_81Z_2_bNhb_V7hgmOTCVpLedgeoa3dpkqI5ZFvQpLcfmgKjJdrmQpEaSTk2Mv_v9_hFFvXFqZvLAQcUtSI-ft7j-_6oh4MlkYoKfpAejw9mlJFfcEEO0gPKc7JKtDoYHyhRycy-K0ohNXpA_6rKtSbynRRcn_N83H1xxao55WiDZlIUKPrnH26Z4ekhLktGM6yBZfTqlt_yGvSWI3RGMRPzsXm8OBVFgQEKM6I1ce94WemA5mdM-Ykk-Deaz4m2r34Rms48vn2hFuLebbnlO-SpNGWqLQx6B5rwnNCF-eOtFPcKTogzLeR68GhGe1NH1kFzAjabWFVQLg7v7WvPOhNcaWTUsz4vpiS_xGtRafQaYbXmGYrNYWA17SnfLIjSHFilTo0ILWhO3hOcE_lTiqZCMIL5q2bpksz04MIHOl8Mr1xrrCv1FncBNyDhw-aWj1J0BYejivy4FDR_g16_ccK4c_Xkgm1aVs6ujVD9t1ai_uutOH6pFsUrwmq05i0r3lajWbDOlSKlJeVzD4zlXMHxHtCnO7Ku1z6nqOJ3XNyDPxuynQdFiM5Q_A3YKPHwKllg5f049u9Go5oaIUl0JWslb9yPBufaEhhAI1SwB6S8x9Q6SsOGrEhWaVLzGNuTjF7VezaIMEW-DiPY7eVDEFXZokE5fFGrERV4jbjQaEoQXmIKwcAIggSAGUMLASZQC8KYQi8Og7NuvJGcLGCkOAqSQ6qInhQiJ9EYDGIeUhQpsAcjk1xkVUG4jtBm1LJ0JhjDpSIXs39TRY0QW7t3LP4_tqI1XAhB1Y2Yg-yDCI0GOspv6clg1nGy3ey29s7dVqW2rCcMNk4w5MvI4W9CVBtnT4KVZudOXBftTwJe2K1DoNvo_zKusqRTLD1qA7cJ0m5pC1Y6XMdqD3G8KPhQVFGQjpVQOic5KUTq9kc2j-BKCxBQ6rRJWpL8WVFJIEF_6ha2ofLy2QFlmi6xBsf3WWtn-keodGjpYN1EaNqCT4d42twWhIFTTG5roMcEFfRO7giiV-Emaur0I3vsensLD-r2IztDsjaAKAlvivYjEKZKT5zUE7NpAEYw8LuvAprZLX2oK8wJewTD0ExKQxT5KA-KlpOgSWGhdWqPb9qbOEjvmmpm8uXHC_TesUNnwC4aNyRTkYMfRDcLqryRETwZOO66FMzBjuBo1gsJqnOuVT0iK1yUjCQtxEpr24N8cgIlGeYZYW_t63g09t1dIu78qwcEhYIwkOJaVJAk0VyI3OT0z9vSs02Efe3YZnCXcjwVURWzNFZXQfuYQN91Q1Z6SGm_LbDVa8VypBek5ZpI4fVPUUu8sFY7honTRIKzjJQaffedFyRZYlaRVi0P29WE8pmIQ1JT-Uw2OWVCgWR_Ozo6alTSFOa-bkJYOH5HOS2mqgIplYqdJ8A_jPyr9sGtTxh1gCOAx4A3JaYyBy1FW9B9TPirj1n1uKcPGrOJdWPLLVJoUAg6PCcy7WS_JCczDFA-_SWmt2CJJ-6JvduwXzDk79eEkUyTHH37EBo1YYTP9WKDqCZFrEbJ7y017lQk2s_0v3YS2H-h1PMVVRp6pTOoXFZz_4_KdZk3BSVf28auFUCjzbMoFyopskk67YycP7qfN-gvxCvodV_bn45RMiDX5CQz0rvMZ0KyZuZTYGsOcaUfGiFvtHan-hcyv44S2tj3Nz9fOthzRkyGHjDztGZbZ_HECeV3xJEjiBodeGPodWl66Hq9twwp9BT6EMvVHaVLovQa6kSJ8xzOZ6COku8lKdBR8o8f4Dcapp8K6WbE6LhcISUYzdESy3gy-aOcuMUJNHtCvhw9ivAB57RSBufv5WoXJc7u5tJUIEO35cLs_O24HO_iklVSCStnKWy17NHBwc-XoJ9LiCXCiYyjDPrcO8idnYBE1qy1rRNwY8GWJHaeEI9GiR2_YiKlYfim7dbGzDCTJ3bV0TS27IWQo4pMS-A9Dc1gaiO5TelhjHzfKTntOGke3Qzkz7wj4ROuKklsR2Rr0s5gCg9n8oMNPVNGv7FPMEudUVWCfHkrS3gZLE0Yy-1QyLbuysm9v5iJm4PUDayW4pFwKYNIsbTtSGhkij7C3A1VE_737RHSApWSLClwd32XGrcqLfxpmkXTXdYESdTh5pyvgCmfchtT6KgOKHQUhYcxAiUcknA_EI9b4deihUGD8Px0QVkeW45ho-MvqqzfqEeUlNNloCZP78XIwYAQYEaMuaR5tIPMrN0Q6DQB91SwqrAMI0lK4BQbP53MqB6jgvICr-KXL4_K1Rgdz-RotBMSly4L1dmnSxaevZ-64-gaWmTfykK0bNv0Uf-oX0I6UXfoHQSzaUQdlO1Qn4BkZQpD3MGFb56AaloJ2xKo1nk7XduTgW3h7iMHvcuo43bDDuq5hrSlTzImxNtJBoaOOgME6cvnlcERbTudhaR2VkhswTN7gjnrCtzaVZPhPRkkVuxupsztQDeDhtmrSaCtqySI4Po2qjWdB51OPVd15r8UtZy3pvY3f2njzJ7_6IsChJP-PvzbLj8kgA2BvfkPXBvsI4YNjPWwAGHQ7C3H4O3DPpIMxNiQUJ2Y-zq5-tcZ-0vWDtKdogUsvkq28H5kb6GaEEN2_4Bcvd7KFS33wQVCL-hF4rC7sXe_jgrajBOtcbbotBnuQPZC25wmdtRjFBWQaKJWqxQMx80Wf6n3dn1R74XE0x8-Gv35qz3D7MKMjA_N14u-CsFvydxe8ZnWQ6IL05TOcEZqRUZN3nsEuJNYngm1nS2eCXQwBTwT9o6wfk70oeDcF99xODxEJ-arIcIGugQHAzeWuCDQZwrbRpp-0jCz9zdlEz2uLrVubpX99piT_Mxc82w7WVNIP364vCZYZosrDOgKnJfn4j5hor5Jsosjc3MQR8TARBCFr02n2fRZdsYx0QDzjRaS5DWHBGTj8eBVhQvLtmjdkKy_Z7U-nppPMLsCcvcHsG5QhQPPVlo3jPUEPXwB_jgR5fZL13ZK2n5wICv7Udjfk_gvD7BysPkPQVvnW4wfAAA" target="_blank" rel="noopener noreferrer" title="Open lightweight Notebook v7 view in a new tab">
      Notebook v7 <i class="fa fa-external-link" aria-hidden="true"></i>
    </a>
  </div>
  <div class="jp-plugin-playground-frame" hidden>
    <iframe
      class="jp-plugin-playground-iframe"
      title="User interface helpers interactive example"
      loading="lazy"
      referrerpolicy="no-referrer"
      allow="clipboard-read; clipboard-write"
    ></iframe>
  </div>
</div>
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
