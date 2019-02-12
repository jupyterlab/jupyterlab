import { staticConverter, Converter } from './converters';
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

export interface IViewerOptions<T> {
  mimeType: string;
  label: string;
  view: (data: T) => Promise<void>;
}
export function createViewerConverter<T>({
  mimeType,
  label,
  view
}: IViewerOptions<T>): Converter<T, () => Promise<void>> {
  return staticConverter({
    sourceMimeType: mimeType,
    targetMimeType: createViewerMimeType(label),
    convert: async (data: T) => () => view(data)
  });
}

export interface IWidgetViewerOptions<T> {
  mimeType: string;
  label: string;
  view: (data: T) => Promise<Widget>;
}

export function createWidgetViewerConverter<T>(
  display: (widget: Widget) => Promise<void>,
  { mimeType, label, view }: IWidgetViewerOptions<T>
): Converter<T, () => Promise<void>> {
  return createViewerConverter({
    mimeType: mimeType,
    label: label,
    view: async (data: T) => await display(await view(data))
  });
}
