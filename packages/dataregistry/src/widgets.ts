import { Converter } from './converters';
import { Widget } from '@phosphor/widgets';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { View, viewerDataType } from './viewers';
import { DataTypeStringArg } from './datatype';

/**
 * A function that creates a widget for the data.
 */
export type WidgetCreator = () => Promise<Widget>;

export const widgetDataType = new DataTypeStringArg<WidgetCreator>(
  'application/x.jupyter.widget',
  'label'
);

export function extractWidgetArgs(
  widget: Widget
): {
  label: string;
  url: string;
} {
  const [label, url] = JSON.parse(widget.id);
  return { label, url };
}

export interface IHasURL {
  url: URL;
}

export function hasURL(t: any): t is IHasURL {
  return 'url' in t;
}

class DataWidget extends MainAreaWidget implements IHasURL {
  constructor(content: Widget, url: URL, label: string) {
    super({ content });
    this.id = JSON.stringify([label, url]);
    this.title.label = `${label}: ${url}`;
    this.title.closable = true;
    this.url = url;
  }
  url: URL;
}

export type WrappedWidgetCreator = () => Promise<DataWidget>;

export const wrappedWidgetDataType = new DataTypeStringArg<
  WrappedWidgetCreator
>('application/x.jupyter.wrapped-widget', 'label');

export const wrapWidgetConverter = widgetDataType.createSingleTypedConverter(
  wrappedWidgetDataType,
  (label, url) => {
    return [
      label,
      async creator => async () => new DataWidget(await creator(), url, label)
    ];
  }
);

export function widgetViewerConverter(
  display: (widget: Widget) => Promise<void>
): Converter<WrappedWidgetCreator, View> {
  return wrappedWidgetDataType.createSingleTypedConverter(
    viewerDataType,
    label => [label, async creator => async () => display(await creator())]
  );
}
