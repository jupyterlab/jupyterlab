


export interface IVariable {
    /**
     * The name of this variable.
     */
    readonly name: string;
    /**
     * The value of this variable.
     */
    readonly value: string;
    /**
     * The type of this variable.
     */
    readonly type: string | undefined;
    /**
     * The description of the variable.
     */
    readonly description: string | undefined;
    /**
     * a data URI or null.
     */
    readonly dataUri?: string;
    /**
     * a data URI or null.
     */
    readonly sourceUri?: string;
}