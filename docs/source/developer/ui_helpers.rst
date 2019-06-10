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
