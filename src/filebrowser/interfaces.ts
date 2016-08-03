// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

/**
 * An interface for a widget opener.
 */
export
interface IWidgetOpener {
  open(widget: Widget): void;
}
