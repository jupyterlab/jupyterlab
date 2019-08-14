// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEndPlugin,
  ILayoutRestorer,
  JupyterFrontEnd
} from '@jupyterlab/application';
import { IDatastoreCreator, DatastoreManager } from '@jupyterlab/datastore';
import {
  ICommandPalette,
  MainAreaWidget,
  ReactWidget,
  WidgetTracker,
  UseSignal
} from '@jupyterlab/apputils';
import { Fields } from '@phosphor/datastore';
import * as React from 'react';
import { toArray } from '@phosphor/algorithm';
import { UUID } from '@phosphor/coreutils';

type TODOProps = {
  datastore: IDatastoreCreator;
};

type TODOState = {
  manager: DatastoreManager | undefined;
};

const TODOSchema = {
  id: 'todo',
  fields: {
    description: Fields.Text(),
    show: Fields.Boolean({ value: true })
  }
};

class TODO extends React.Component<TODOProps, TODOState> {
  readonly state: TODOState = {
    manager: undefined
  };

  input = React.createRef<HTMLInputElement>();

  async componentDidMount() {
    const manager = await this.props.datastore.createTable('todo', [
      TODOSchema
    ]);
    this.setState({ manager });
  }
  render() {
    if (!this.state.manager) {
      return <div>Loading...</div>;
    }
    return (
      <div>
        <h1>TODO</h1>
        <ol>
          <UseSignal signal={this.state.manager.changed}>
            {() =>
              toArray(this.state.manager.datastore.get(TODOSchema).iter()).map(
                row =>
                  row.show ? (
                    <li id={row.$id}>
                      {row.description}
                      <button
                        onClick={event => {
                          this.state.manager.datastore.beginTransaction();
                          this.state.manager.datastore.get(TODOSchema).update({
                            [row.$id]: { show: false }
                          });
                          this.state.manager.datastore.endTransaction();
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
            this.state.manager.datastore.beginTransaction();
            this.state.manager.datastore.get(TODOSchema).update({
              [UUID.uuid4()]: {
                description: {
                  index: 0,
                  remove: 0,
                  text: this.input.current.value
                }
              }
            });
            this.state.manager.datastore.endTransaction();
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
    this.state.manager && this.state.manager.dispose();
  }
}

export default {
  id: '@jupyterlab/datastore-extension:todo-plugin',
  requires: [IDatastoreCreator, ILayoutRestorer, ICommandPalette],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    datastore: IDatastoreCreator,
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
          const content = ReactWidget.create(<TODO datastore={datastore} />);
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
