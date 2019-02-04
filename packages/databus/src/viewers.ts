import { staticConverter, Converter, Convert } from './converters';
import { Widget } from '@phosphor/widgets';

const baseMimeType = 'application/x.jupyter.viewer; label=';

export function createViewerMimeType(label: string) {
  return `${baseMimeType}${label}`;
}

export function extractViewerLabel(mimeType: string): string | null {
  if (!mimeType.startsWith(baseMimeType)) {
    return null;
  }
  return mimeType.slice(baseMimeType.length);
}

export type ViewConverter<T> = Converter<T, () => Promise<void>>;

export interface IViewerOptions<T> {
  mimeType: string;
  label: string;
  view: Convert<T, () => Promise<void>>;
}
export function createViewerConverter<T>({
  mimeType,
  label,
  view
}: IViewerOptions<T>): ViewConverter<T> {
  return staticConverter({
    sourceMimeType: mimeType,
    targetMimeType: createViewerMimeType(label),
    convert: view
  });
}

export interface IWidgetViewerOptions<T> {
  mimeType: string;
  label: string;
  view: (data: T) => Promise<Widget>;
}

export function extractArgs(
  widget: Widget
): {
  label: string;
  url: string;
} {
  const [label, url] = JSON.parse(widget.id);
  console.log('extracting args', label, url);
  return { label, url };
}

export function createWidgetViewerConverter<T>(
  display: (widget: Widget) => Promise<void>,
  { mimeType, label, view }: IWidgetViewerOptions<T>
): ViewConverter<T> {
  return createViewerConverter({
    mimeType: mimeType,
    label: label,
    view: async (data: T, url: URL) => {
      const widget = await view(data);
      widget.id = JSON.stringify([label, url]);
      widget.title.label = `${label}: ${url}`;
      widget.title.closable = true;
      return async () => await display(widget);
    }
  });
}
