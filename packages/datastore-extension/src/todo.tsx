// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEndPlugin,
  ILayoutRestorer,
  JupyterFrontEnd
} from '@jupyterlab/application';
import { createDatastore } from '@jupyterlab/datastore';
import {
  ICommandPalette,
  MainAreaWidget,
  ReactWidget,
  WidgetTracker,
  UseSignal
} from '@jupyterlab/apputils';
import { Fields, Datastore } from '@phosphor/datastore';
import * as React from 'react';
import { toArray } from '@phosphor/algorithm';
import { UUID } from '@phosphor/coreutils';

type TODOState = {
  datastore: Datastore | undefined;
};

const TODOSchema = {
  id: 'todo',
  fields: {
    description: Fields.Text(),
    show: Fields.Boolean({ value: true })
  }
};

class TODO extends React.Component<{}, TODOState> {
  readonly state: TODOState = {
    datastore: undefined
  };

  input = React.createRef<HTMLInputElement>();

  async componentDidMount() {
    const datastore = await createDatastore('todo', [TODOSchema]);
    this.setState({ datastore });
  }
  render() {
    const { datastore } = this.state;
    if (!datastore) {
      return <div>Loading...</div>;
    }
    const table = datastore.get(TODOSchema);
    return (
      <div>
        <h1>TODO</h1>
        <ol>
          <UseSignal signal={datastore.changed}>
            {() =>
              toArray(table.iter()).map(row =>
                row.show ? (
                  <li id={row.$id}>
                    {row.description}
                    <button
                      onClick={event => {
                        datastore.beginTransaction();
                        table.update({
                          [row.$id]: { show: false }
                        });
                        datastore.endTransaction();
                        event.preventDefault();
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ) : (
                  <></>
                )
              )
            }
          </UseSignal>
        </ol>
        <form
          onSubmit={e => {
            datastore.beginTransaction();
            table.update({
              [UUID.uuid4()]: {
                description: {
                  index: 0,
                  remove: 0,
                  text: this.input.current.value
                }
              }
            });
            datastore.endTransaction();
            e.preventDefault();
          }}
        >
          <label>
            Task:
            <input type="text" ref={this.input} />
          </label>
          <input type="submit" value="Add" />
        </form>
      </div>
    );
  }

  componentWillUnmount() {
    this.state.datastore && this.state.datastore.dispose();
  }
}

export default {
  id: '@jupyterlab/datastore-extension:todo-plugin',
  requires: [ILayoutRestorer, ICommandPalette],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer,
    palette: ICommandPalette
  ) => {
    // Declare a widget variable
    let widget: MainAreaWidget<ReactWidget>;

    // Add an application command
    const command: string = 'todo:open';
    app.commands.addCommand(command, {
      label: 'Open TODO',
      execute: async () => {
        if (!widget) {
          // Create a new widget if one does not exist
          const content = ReactWidget.create(<TODO />);
          widget = new MainAreaWidget({ content });
          widget.id = 'todo';
          widget.title.label = 'TODO';
          widget.title.closable = true;
        }
        if (!tracker.has(widget)) {
          // Track the state of the widget for later restoration
          await tracker.add(widget);
        }
        if (!widget.isAttached) {
          // Attach the widget to the main work area if it's not there
          app.shell.add(widget, 'main');
        }
        widget.content.update();

        // Activate the widget
        app.shell.activateById(widget.id);
      }
    });

    // Add the command to the palette.
    palette.addItem({ command, category: 'TODO' });

    // Track and restore the widget state
    let tracker = new WidgetTracker<MainAreaWidget<ReactWidget>>({
      namespace: 'todo'
    });
    void restorer.restore(tracker, {
      command,
      name: () => 'todo'
    });
  }
} as JupyterFrontEndPlugin<void>;
