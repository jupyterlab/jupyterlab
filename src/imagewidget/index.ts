// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './widget';


/**
 * The command IDs used by the image widget plugin.
 */
export
namespace CommandIDs {
  export
  const zoomIn: string = 'imagewidget:zoom-in';

  export
  const zoomOut: string = 'imagewidget:zoom-out';

  export
  const resetZoom: string = 'imagewidget:reset-zoom';
};
