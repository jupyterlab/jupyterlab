import { DataTypeStringArg } from './datatype';

/**
 * A function that is called to view the data in some way.
 */
export type View = () => Promise<void>;

export const viewerDataType = new DataTypeStringArg<View>(
  'application/x.jupyter.viewer',
  'label'
);
