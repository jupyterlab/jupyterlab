// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IListChangedArgs, ListChangeType, ObservableList, IObservableList
} from 'phosphor-observablelist';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  ResizeMessage, Widget
} from 'phosphor-widget';

import {
  Panel
} from 'phosphor-panel';

import {
    Transformime,
    TextTransformer,
    ImageTransformer,
    HTMLTransformer
} from "transformime";

import {
    consoleTextTransform,
    markdownTransform,
    LaTeXTransform,
    PDFTransform,
    SVGTransform,
    ScriptTransform
} from "transformime-jupyter-transformers";

import {
  IOutputAreaModel, OutputModel, ExecuteResultModel, OutputType,
  ExecuteErrorModel, StreamModel, DisplayDataModel, MimeBundle
} from './model';

import {
  DisposableDelegate, IDisposable
} from 'phosphor-disposable';


/**
 * A list of transformers used to render outputs
 * 
 * #### Notes
 * The transformers are in ascending priority--later transforms are more
 * important than earlier ones.
 */
let transformers = [
    TextTransformer,
    PDFTransform,
    ImageTransformer,
    SVGTransform,
    consoleTextTransform,
    LaTeXTransform,
    markdownTransform,
    HTMLTransformer,
    ScriptTransform
];

/**
 * A global transformime object to render all outputs.
 */
let transform = new Transformime(transformers);


/**
 * An output area widget.
 */
export
class OutputAreaWidget extends Panel {
  
  /**
   * Construct an output area widget.
   */
  constructor(model: IOutputAreaModel) {
    super();
    this.addClass('jp-OutputArea');
    this._model = model;
    model.stateChanged.connect(this.modelStateChanged, this);
    this._listdispose = follow<OutputModel>(model.outputs, this, (out) => {
      let w = new Widget();
      this.renderItem(out).then((out) => {
        w.node.appendChild(out);
      });
      return w;
    });
  }
  
  /**
   * Render an item using the transformime library.
   */
  renderItem(output: OutputModel): Promise<HTMLElement> {
    let bundle: MimeBundle;
    switch(output.outputType) {
    case OutputType.ExecuteResult:
      bundle = (output as ExecuteResultModel).data;
      break;
    case OutputType.DisplayData:
      bundle = (output as DisplayDataModel).data;
      break;
    case OutputType.Stream:
      bundle = {'jupyter/console-text': (output as StreamModel).text};
      break;
    case OutputType.Error:
      let out: ExecuteErrorModel = output as ExecuteErrorModel;
      bundle = {'jupyter/console-text': out.traceback || `${out.ename}: ${out.evalue}`};
      break;
    default:
      console.error(`Unrecognized output type: ${output.outputType}`);
      bundle = {};
    }
    return (transform.transform(bundle, document)
            .then((result) => {return result.el}));
  }

  /**
   * Change handler for model state changes.
   */
  protected modelStateChanged(sender: IOutputAreaModel, 
                              args: IChangedArgs<any>) {
    switch (args.name) {
    case 'collapsed':
      break;
    case 'fixedHeight':
      break;
    case 'prompt':
      break;
    }
  }

  /**
   * Dispose the object and its data attributes.
   */
  dispose() {
    this._listdispose.dispose();
    super.dispose();
  }
  
  private _model: IOutputAreaModel;
  private _listdispose: IDisposable;
}

/**
 * Make a panel mirror changes to an observable list.
 * 
 * @param source - The observable list.
 * @param sink - The Panel.
 * @param factory - A function which takes an item from the list and constructs a widget.
 */
function follow<T>(source: IObservableList<T>, 
                     sink: Panel, 
                     factory: (arg: T)=> Widget): IDisposable {

  for (let i = sink.childCount()-1; i>=0; i--) {
    sink.childAt(i).dispose();
  }
  for (let i=0; i<source.length; i++) {
    sink.addChild(factory(source.get(i)))
  }
  function callback(sender: ObservableList<T>, args: IListChangedArgs<T>) {
    switch(args.type) {
    case ListChangeType.Add:
      sink.insertChild(args.newIndex, factory(args.newValue as T))
      break;
    case ListChangeType.Move:
      sink.insertChild(args.newIndex, sink.childAt(args.oldIndex));
      break;
    case ListChangeType.Remove:
      sink.childAt(args.oldIndex).dispose();
      break;
    case ListChangeType.Replace:
      for (let i = (args.oldValue as T[]).length; i>0; i--) {
        sink.childAt(args.oldIndex).dispose();
      }
      for (let i = (args.newValue as T[]).length; i>0; i--) {
        sink.insertChild(args.newIndex, factory((args.newValue as T[])[i]))
      }
      break;
    case ListChangeType.Set:
      sink.childAt(args.newIndex).dispose();
      sink.insertChild(args.newIndex, factory(args.newValue as T))
      break;
    }
  }
  source.changed.connect(callback);
  return new DisposableDelegate(() => {
    source.changed.disconnect(callback);
  })
}

