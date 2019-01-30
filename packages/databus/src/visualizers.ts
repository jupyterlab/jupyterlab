import { IDataset } from './dataregistry';
import { Token } from '@phosphor/coreutils';
import { Widget } from '@phosphor/widgets';

/**
 * An interface to visualize a dataset,
 */
export interface IVisualizer<A extends IDataset<any>> {
  /**
   * Checks whether this visualizer works on a certain mimetype.
   */
  canVisualize: (mimeType: string) => boolean;

  /**
   * Returns a widget that uses the dataset.
   */
  visualize: (input: A) => Promise<Widget>;

  /**
   * Label for the visualizer, used in the UI.
   */
  label: string
}

export abstract class StaticVisualizer<A extends IDataset<any>>
  implements IVisualizer<A> {
  abstract mimeType: string;

  abstract visualize(input: A): Promise<Widget>;
  abstract label: string;

  canVisualize(mimeType: string) {
    return this.mimeType === mimeType;
  }
}

export class VisualizerRegistry {
  register(visualizer: IVisualizer<any>) {
    this._visualizers.add(visualizer);
  }

  filter(mimeType: string): Set<IVisualizer<any>> {
    return new Set(
      [...this._visualizers].filter(v => v.canVisualize(mimeType))
    );
  }

  private _visualizers: Set<IVisualizer<any>> = new Set();
}

export interface IVisualizerRegistry extends VisualizerRegistry {}

/* tslint:disable */
export const IVisualizerRegistry = new Token<IVisualizerRegistry>(
  '@jupyterlab/databus:IVisualizerRegistry'
);
