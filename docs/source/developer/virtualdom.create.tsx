import * as React from 'react';

import { Widget } from '@phosphor/widgets';
import { ReactWidget } from '@jupyterlab/apputils';

function MyComponent() {
  return <div>My Widget</div>;
}

const myWidget: Widget = ReactWidget.create(<MyComponent />);
