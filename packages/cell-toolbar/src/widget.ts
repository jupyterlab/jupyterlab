import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';
import { Toolbar } from '@jupyterlab/ui-components';

export class CellToolbarFactory extends ABCWidgetFactory<
  IDocumentWidget<Toolbar>
> {
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): IDocumentWidget<Toolbar> {
    const content = new Toolbar();
    const widget = new DocumentWidget({ content, context });
    return widget;
  }
}
