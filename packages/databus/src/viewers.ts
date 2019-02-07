const baseMimeType = 'application/x.jupyter.viewer; label=';
/**
 * Two types of viewers:
 *
 * Those that return widgets, those that etc.
 *
 * OK so first convert to widget. Then have conversion from widget to viewer :D
 * @param label
 */
export function createViewerMimeType(label: string) {
  return `${baseMimeType}${label}`;
}

export function extractViewerLabel(mimeType: string): string | null {
  if (!mimeType.startsWith(baseMimeType)) {
    return null;
  }
  return mimeType.slice(baseMimeType.length);
}

export type View = () => Promise<void>;
