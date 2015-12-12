'use-strict';

import {
  Widget
} from 'phosphor-widget';

import {
  NotebookViewModel, NotebookWidget, makeModels
} from '../lib/index';


function main(): void {
  System.import('example/data/data.json').then((data: any) => {
    let nbModel = makeModels(data);
    let nbWidget = new NotebookWidget(nbModel);
    Widget.attach(nbWidget, document.body);    
  });
}

main();
