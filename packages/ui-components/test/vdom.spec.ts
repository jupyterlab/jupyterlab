// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ReactWidget,
  VDomModel,
  VDomRenderer
} from '@jupyterlab/ui-components';
import { framePromise } from '@jupyterlab/testing';
import { MessageLoop } from '@lumino/messaging';
import { Panel, Widget } from '@lumino/widgets';
import * as React from 'react';

class TestModel extends VDomModel {
  get value(): string {
    return this._value;
  }

  set value(newValue: string) {
    this._value = newValue;
    this.stateChanged.emit(void 0);
  }

  private _value = '';
}

class TestWidget extends VDomRenderer<TestModel> {
  protected render(): React.ReactElement<any> {
    return React.createElement('span', null, this.model.value);
  }
}

class LifecycleCounter extends React.Component {
  static mounts = 0;
  static unmounts = 0;

  componentDidMount(): void {
    LifecycleCounter.mounts++;
  }

  componentWillUnmount(): void {
    LifecycleCounter.unmounts++;
  }

  render(): React.ReactElement {
    return React.createElement('span', null, 'counter');
  }
}

/**
 * Record whether the rendered node is in the document when a layout effect
 * cleanup runs.
 */
const ConnectionProbe = (props: { connected: boolean[] }) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const node = ref.current!;
    return () => {
      props.connected.push(node.isConnected);
    };
  }, []);
  return React.createElement('span', { ref }, 'probe');
};

/**
 * Create a component whose layout effect cleanup throws the first time it runs.
 */
const createThrowingCleanup = () => {
  let fail = true;
  return () => {
    React.useLayoutEffect(
      () => () => {
        if (fail) {
          fail = false;
          throw new Error('cleanup failed');
        }
      },
      []
    );
    return React.createElement('span', { className: 'rendered' });
  };
};

class TestWidgetNoModel extends VDomRenderer {
  protected render(): React.ReactElement<any> {
    return React.createElement('span', null, 'No model!');
  }
}

describe('@jupyterlab/ui-components', () => {
  describe('VDomModel', () => {
    describe('#constructor()', () => {
      it('should create a VDomModel', () => {
        const model = new VDomModel();
        expect(model).toBeInstanceOf(VDomModel);
      });

      it('should create a TestModel', () => {
        const model = new TestModel();
        expect(model).toBeInstanceOf(TestModel);
      });

      it('should be properly disposed', () => {
        const model = new TestModel();
        model.dispose();
        expect(model.isDisposed).toBe(true);
      });
    });

    describe('#stateChanged()', () => {
      it('should fire the stateChanged signal on a change', () => {
        const model = new TestModel();
        let changed = false;
        model.stateChanged.connect(() => {
          changed = true;
        });
        model.value = 'newvalue';
        expect(changed).toBe(true);
      });
    });
  });

  describe('ReactWidget', () => {
    beforeEach(() => {
      LifecycleCounter.mounts = 0;
      LifecycleCounter.unmounts = 0;
    });

    it('should keep the React tree mounted when the widget is moved', async () => {
      const source = new Panel();
      const target = new Panel();
      Widget.attach(source, document.body);
      Widget.attach(target, document.body);
      const widget = ReactWidget.create(React.createElement(LifecycleCounter));
      source.addWidget(widget);
      await widget.renderPromise;
      target.addWidget(widget);
      await widget.renderPromise;
      expect(LifecycleCounter.mounts).toBe(1);
      expect(LifecycleCounter.unmounts).toBe(0);
      source.dispose();
      target.dispose();
    });

    it('should unmount the React tree when the widget is closed', async () => {
      const panel = new Panel();
      Widget.attach(panel, document.body);
      const widget = ReactWidget.create(React.createElement(LifecycleCounter));
      panel.addWidget(widget);
      await widget.renderPromise;
      widget.close();
      await Promise.resolve();
      expect(LifecycleCounter.unmounts).toBe(1);
      widget.dispose();
      panel.dispose();
    });

    it('should unmount the React tree when disposed', async () => {
      const widget = ReactWidget.create(React.createElement(LifecycleCounter));
      Widget.attach(widget, document.body);
      await widget.renderPromise;
      widget.dispose();
      expect(LifecycleCounter.unmounts).toBe(1);
    });

    it('should unmount the React tree when a widget rendered while detached is disposed', async () => {
      const widget = ReactWidget.create(React.createElement(LifecycleCounter));
      MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
      await widget.renderPromise;
      widget.dispose();
      expect(LifecycleCounter.unmounts).toBe(1);
    });

    it('should unmount the React tree before the node leaves the document when the parent is disposed', async () => {
      const connected: boolean[] = [];
      const panel = new Panel();
      Widget.attach(panel, document.body);
      const widget = ReactWidget.create(
        React.createElement(ConnectionProbe, { connected })
      );
      panel.addWidget(widget);
      await widget.renderPromise;
      panel.dispose();
      expect(connected).toEqual([true]);
    });

    it('should unmount the React tree before the node leaves the document when the widget is closed', async () => {
      const connected: boolean[] = [];
      const panel = new Panel();
      Widget.attach(panel, document.body);
      const widget = ReactWidget.create(
        React.createElement(ConnectionProbe, { connected })
      );
      panel.addWidget(widget);
      await widget.renderPromise;
      widget.close();
      await Promise.resolve();
      expect(connected).toEqual([true]);
      widget.dispose();
      panel.dispose();
    });

    it('should unmount the React tree before the node leaves the document when the widget is moved to a detached parent', async () => {
      const connected: boolean[] = [];
      const source = new Panel();
      const target = new Panel();
      Widget.attach(source, document.body);
      const widget = ReactWidget.create(
        React.createElement(ConnectionProbe, { connected })
      );
      source.addWidget(widget);
      await widget.renderPromise;
      target.addWidget(widget);
      await Promise.resolve();
      expect(connected).toEqual([true]);
      source.dispose();
      target.dispose();
    });

    it('should unmount the React tree before the node leaves the document when the widget is moved to a parent without a layout', async () => {
      const connected: boolean[] = [];
      const source = new Panel();
      const target = new Widget();
      Widget.attach(source, document.body);
      Widget.attach(target, document.body);
      const widget = ReactWidget.create(
        React.createElement(ConnectionProbe, { connected })
      );
      source.addWidget(widget);
      await widget.renderPromise;
      widget.parent = target;
      expect(connected).toEqual([true]);
      widget.dispose();
      source.dispose();
      target.dispose();
    });

    it('should unmount the React tree when the new parent does not attach the widget', async () => {
      const source = new Panel();
      const target = new Panel();
      Widget.attach(source, document.body);
      Widget.attach(target, document.body);
      const widget = ReactWidget.create(React.createElement(LifecycleCounter));
      source.addWidget(widget);
      await widget.renderPromise;
      // Setting the parent directly does not add the widget to the layout.
      widget.parent = target;
      await Promise.resolve();
      expect(LifecycleCounter.unmounts).toBe(1);
      widget.dispose();
      source.dispose();
      target.dispose();
    });

    it('should be disposed when a cleanup throws', async () => {
      const spy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const Throws = createThrowingCleanup();
      const panel = new Panel();
      Widget.attach(panel, document.body);
      const widget = ReactWidget.create(React.createElement(Throws));
      try {
        panel.addWidget(widget);
        await widget.renderPromise;
        expect(() => widget.dispose()).toThrow('cleanup failed');
        expect(widget.isDisposed).toBe(true);
      } finally {
        spy.mockRestore();
        widget.dispose();
        panel.dispose();
      }
    });

    it('should render again after a cleanup throws', async () => {
      const spy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const Throws = createThrowingCleanup();
      const panel = new Panel();
      Widget.attach(panel, document.body);
      const widget = ReactWidget.create(React.createElement(Throws));
      try {
        panel.addWidget(widget);
        await widget.renderPromise;
        widget.close();
        await Promise.resolve();
        panel.addWidget(widget);
        await expect(widget.renderPromise).resolves.toBeUndefined();
        expect(widget.node.querySelector('.rendered')).not.toBeNull();
      } finally {
        spy.mockRestore();
        widget.dispose();
        panel.dispose();
      }
    });

    it('should render again after a cleanup throws on a null render', async () => {
      const spy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const Throws = createThrowingCleanup();
      let show = true;
      const widget = new (class extends ReactWidget {
        protected render() {
          return show ? React.createElement(Throws) : null;
        }
      })();
      try {
        Widget.attach(widget, document.body);
        await widget.renderPromise;
        show = false;
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        await widget.renderPromise?.catch(() => undefined);
        show = true;
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        await expect(widget.renderPromise).resolves.toBeUndefined();
        expect(widget.node.querySelector('.rendered')).not.toBeNull();
      } finally {
        spy.mockRestore();
        widget.dispose();
      }
    });
  });

  describe('VDomRenderer', () => {
    describe('#constructor()', () => {
      it('should create a TestWidget', () => {
        const widget = new TestWidget(new TestModel());
        expect(widget).toBeInstanceOf(TestWidget);
      });

      it('should be properly disposed', () => {
        const widget = new TestWidget(new TestModel());
        widget.dispose();
        expect(widget.isDisposed).toBe(true);
      });
    });

    describe('#modelChanged()', () => {
      it('should fire the stateChanged signal on a change', async () => {
        const model = new TestModel();
        const widget = new TestWidget(new TestModel());
        let changed = false;
        widget.modelChanged.connect(() => {
          changed = true;
        });
        widget.model = model;
        expect(changed).toBe(true);
      });
    });

    describe('#render()', () => {
      it('should render the contents after a model change', async () => {
        const widget = new TestWidget(new TestModel());
        const model = new TestModel();
        Widget.attach(widget, document.body);
        widget.model = model;
        model.value = 'foo';
        await framePromise();
        await widget.renderPromise;
        await framePromise();
        const span = widget.node.firstChild as HTMLElement;
        expect(span.textContent).toBe('foo');
      });
    });

    describe('#noModel()', () => {
      it('should work with a null model', async () => {
        const widget = new TestWidgetNoModel();
        Widget.attach(widget, document.body);
        await framePromise();
        await widget.renderPromise;
        const span = widget.node.firstChild as HTMLElement;
        expect(span.textContent).toBe('No model!');
      });
    });
  });
});
