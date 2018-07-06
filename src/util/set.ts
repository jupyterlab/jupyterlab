export namespace SetExt {
    export function union<T>(a: Set<T>, b: Set<T>): Set<T> {
        return new Set([...a, ...b]);
    }

    export function intersection<T>(a: Set<T>, b: Set<T>): Set<T> {
        return new Set([...a].filter(x => b.has(x)));
    }

    export function difference<T>(a: Set<T>, b: Set<T>): Set<T> {
        return new Set([...a].filter(x => !b.has(x)));
    }
}
