User Interface Helpers
----------------------

JupyterLab comes with helpers to show or request simple information from a user.
Those speed up development and ensure a common look and feel.

Dialogs
~~~~~~~

Message Dialogs
'''''''''''''''

Helper functions to show a message to the user are available in the ``apputils`` package.
These dialogs return a ``Promise`` resolving when the user dismisses the dialog.

There is one helper:

* ``showErrorMessage`` : show an error message dialog.


Input Dialogs
'''''''''''''

Helper functions to request a single input from the user are available in the ``apputils``
package within the ``InputDialog`` namespace. There are four helpers:

* ``getBoolean`` : request a boolean through a checkbox.
* ``getItem`` : request a item from a list; the list may be editable.
* ``getNumber`` : request a number; if the user input is not a valid number, NaN is returned.
* ``getText`` : request a short text.
* ``getPassword`` : request a short password.

All dialogs are built on the standard ``Dialog``. Therefore the helper functions each return
a ``Promise`` resolving in a ``Dialog.IResult`` object.

.. code:: typescript

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


File Dialogs
''''''''''''

Two helper functions to ask a user to open a file or a directory are
available in the ``filebrowser`` package under the namespace ``FileDialog``.

Here is an example to request a file.

.. code:: typescript

    const dialog = FileDialog.getOpenFiles({
      manager, // IDocumentManager
      filter: model => model.type == 'notebook' // optional (model: Contents.IModel) => boolean
    });

    const result = await dialog;

    if(result.button.accept){
      let files = result.value;
    }

And for a folder.

.. code:: typescript

    const dialog = FileDialog.getExistingDirectory({
      manager // IDocumentManager
    });

    const result = await dialog;

    if(result.button.accept){
      let folders = result.value;
    }

.. note:: The document manager can be obtained in a plugin by
    requesting ``IFileBrowserFactory`` token. The ``manager`` will be accessed through
    ``factory.defaultBrowser.model.manager``.
