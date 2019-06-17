import * as React from 'react';

import { Widget } from '@phosphor/widgets';
import { ReactWidget } from '@jupyterlab/apputils';

const myWidget: Widget = ReactWidget.create(<div>My Widget</div>);
