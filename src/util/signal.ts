import { ISignal, Signal } from '@phosphor/signaling';

export namespace SignalExt {
    export function combine<S, T>(
        sender: S,
        a: ISignal<any, T>,
        b: ISignal<any, T>
    ): Signal<S, T> {
        const combinedSignal: Signal<S, T> = new Signal(sender);
        const forwardValue = (_aSender: any, value: T) => {
            combinedSignal.emit(value);
        };

        a.connect(forwardValue);
        b.connect(forwardValue);

        return combinedSignal;
    }
}
