import * as React from 'react';

export namespace ProgressBar {
    export interface IProps {
        percentage: number;
    }
}

export const ProgressBar = (props: ProgressBar.IProps) => {
    return (
        <div
            className="progress-bar"
            style={{
                background: 'black',
                height: 10,
                width: 100
            }}
        >
            <Filler percentage={props.percentage} />
        </div>
    );
};

export namespace Filler {
    export interface IProps {
        percentage: number;
    }
}

export const Filler = (props: Filler.IProps) => {
    console.log(props.percentage);
    return (
        <div
            className="filler"
            style={{
                background: 'lightgreen',
                height: 10,
                width: props.percentage
            }}
        >
            {' '}
        </div>
    );
};
