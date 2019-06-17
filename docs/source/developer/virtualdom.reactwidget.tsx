import * as React from 'react';

import { Widget } from '@phosphor/widgets';
import { ReactWidget } from '@jupyterlab/apputils';

class MyWidget extends ReactWidget {
  render() {
    return <div>My Widget</div>;
  }
}
const myWidget: Widget = new MyWidget();
