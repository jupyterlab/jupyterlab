import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  duplicateIcon,
  Toolbar,
  ToolbarButton
} from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';

type widgetType = IDocumentWidget<Toolbar<Widget>, DocumentRegistry.IModel>;

export class CellToolbarFactory extends ABCWidgetFactory<
  IDocumentWidget<Toolbar>
> {
  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): IDocumentWidget<Toolbar> {
    // Need to get the toolbar buttons
    const content = new Toolbar();
    const widget = new DocumentWidget({ content, context });
    return widget;
  }

  protected defaultToolbarFactory(
    widget: widgetType
  ): DocumentRegistry.IToolbarItem[] {
    return [
      {
        name: 'duplicate',
        widget: ToolbarItems.createDuplicateButton(widget, this.translator)
      }
      // TODO: createMoveUpButton
      // TODO: createMoveDownButton
      // TODO: createAddAboveButton
      // TODO: createAddBelowButton
      // TODO: createDeleteButton
    ];
  }
}
export namespace ToolbarItems {
  export function createDuplicateButton(
    widget: widgetType,
    translator?: ITranslator
  ): Widget {
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    return new ToolbarButton({
      icon: duplicateIcon,
      onClick: () => {
        // TODO: Run the notebook "duplicate-below" command
        console.log('Clicked duplicate button');
      },
      actualOnClick: true,
      tooltip: trans.__('Duplicate Selected Cells Below')
    });
  }
}
