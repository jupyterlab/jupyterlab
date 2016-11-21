
export function getExtension(uri: monaco.Uri): string | null {
    const path = uri.path;
    const index = path.lastIndexOf('.');
    return index === -1 ? null : path.substring(index);
}
