import * as React from 'react';

import { Widget } from '@lumino/widgets';
import { ReactWidget } from '@jupyterlab/apputils';

function MyComponent() {
  return <div>My Widget</div>;
}
class MyWidget extends ReactWidget {
  render() {
    return <MyComponent />;
  }
}
const myWidget: Widget = new MyWidget();
Widget.attach(myWidget, document.body);
