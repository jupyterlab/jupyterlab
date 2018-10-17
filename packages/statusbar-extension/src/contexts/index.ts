import { IInstanceTracker } from '@jupyterlab/apputils';
import { Widget } from '@phosphor/widgets';
import { ApplicationShell } from '@jupyterlab/application';

export interface IStatusContext<T extends Widget> {
  tracker: IInstanceTracker<T>;

  isEnabled?: (widget: T) => boolean;
}

export namespace IStatusContext {
  function findContext<E extends IStatusContext<Widget>>(
    widget: Widget,
    contexts: Array<E>
  ): E | undefined {
    return contexts.find((context: E) => {
      return context.tracker.has(widget);
    });
  }

  export function delegateActive<E extends IStatusContext<Widget>>(
    shell: ApplicationShell,
    contexts: Array<E>
  ): () => boolean {
    return () => {
      const currentWidget: Widget | null = shell.currentWidget;

      if (currentWidget !== null) {
        const context = findContext(currentWidget, contexts);
        return (
          !!context &&
          (context.isEnabled ? context.isEnabled(currentWidget) : true)
        );
      } else if (contexts.length === 0) {
        return true;
      } else {
        return false;
      }
    };
  }
}
