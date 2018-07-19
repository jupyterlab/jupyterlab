import * as React from 'react';
import { groupitem } from './style/group';

// tslint:disable-next-line:variable-name
export const GroupItem = (children: any) => {
    return <div className={groupitem}>{children}</div>;
};
