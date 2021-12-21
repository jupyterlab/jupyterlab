import {
    Application,
    DefaultTheme,
    DefaultThemeRenderContext,
    JSX,
    Options,
    PageEvent,
    Reflection,
    DeclarationReflection,
    SignatureReflection,
    TypeParameterReflection,
} from "typedoc";


/**
 * Copied from TypeDoc source code because is not exported
 * https://github.com/TypeStrong/typedoc/blob/3f0dbeab09ec61b5351f6766a0b13f37ea26c8c7/src/lib/output/themes/lib.tsx#L41-L52
 */
export function join<T>(joiner: JSX.Children, list: readonly T[], cb: (x: T) => JSX.Children) {
    const result: JSX.Children = [];

    for (const item of list) {
        if (result.length > 0) {
            result.push(joiner);
        }
        result.push(cb(item));
    }

    return <>{result}</>;
}

/**
 * Copied from TypeDoc source code because is not exported
 * https://github.com/TypeStrong/typedoc/blob/3f0dbeab09ec61b5351f6766a0b13f37ea26c8c7/src/lib/output/themes/lib.tsx#L73-L80
 */
export function hasTypeParameters(
    reflection: Reflection
): reflection is Reflection & { typeParameters: TypeParameterReflection[] } {
    if (reflection instanceof DeclarationReflection || reflection instanceof SignatureReflection) {
        return reflection.typeParameters != null;
    }
    return false;
}

/**
 * The theme context is where all of the partials live for rendering a theme,
 * in addition to some helper functions.
 * 
 * https://github.com/TypeStrong/typedoc/blob/master/src/lib/output/themes/default/partials/header.tsx
 */
export class HeaderOverrideThemeContext extends DefaultThemeRenderContext {
    constructor(theme: DefaultTheme, options: Options) {
        super(theme, options);

        // Overridden methods must have `this` bound if they intend to use it.
        // <JSX.Raw /> may be used to inject HTML directly.
        this.header = (props: PageEvent<Reflection>) => {
            return (
                <header>
                    <div class="tsd-page-toolbar">
                        <div class="container">
                            <div class="table-wrap">
                                <div class="table-cell" id="tsd-search" data-base={this.relativeURL("./")}>
                                    <div class="field">
                                        <label for="tsd-search-field" class="tsd-widget search no-caption">
                                            Search
                                        </label>
                                        <input type="text" id="tsd-search-field" />
                                    </div>
            
                                    <ul class="results">
                                        <li class="state loading">Preparing search index...</li>
                                        <li class="state failure">The search index is not available</li>
                                    </ul>
            
                                    <a href={this.relativeURL("index.html")} class="title">
                                        {props.project.name}
                                    </a>
                                </div>
            
                                <div class="table-cell" id="tsd-widgets">
                                    <div id="tsd-filter">
                                        <a href="#" class="tsd-widget options no-caption" data-toggle="options">
                                            Options
                                        </a>
                                        <div class="tsd-filter-group">
                                            <div class="tsd-select" id="tsd-filter-visibility">
                                                <span class="tsd-select-label">All</span>
                                                <ul class="tsd-select-list">
                                                    <li data-value="public">Public</li>
                                                    <li data-value="protected">Public/Protected</li>
                                                    <li data-value="private" class="selected">
                                                        All
                                                    </li>
                                                </ul>
                                            </div>{" "}
                                            <input type="checkbox" id="tsd-filter-inherited" checked={true} />
                                            <label class="tsd-widget" for="tsd-filter-inherited">
                                                Inherited
                                            </label>
                                            {!this.options.getValue("excludeExternals") && (
                                                <>
                                                    <input type="checkbox" id="tsd-filter-externals" checked={true} />
                                                    <label class="tsd-widget" for="tsd-filter-externals">
                                                        Externals
                                                    </label>
                                                </>
                                            )}
                                            {!this.options.getValue("excludeNotExported") && (
                                                <>
                                                    <input type="checkbox" id="tsd-filter-exported" checked={true} />
                                                    <label class='tsd-widget' for='tsd-filter-exported'>
                                                        Only exported
                                                    </label>
                                                </>
                                            )}
                                        </div>
                                    </div>
            
                                    <a href="#" class="tsd-widget menu no-caption" data-toggle="menu">
                                        Menu
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="tsd-page-title">
                        <div class="container">
                            <ul class="tsd-breadcrumb">{this.breadcrumb(props.model)}</ul>
                            <h1>
                                {`${props.model.kindString ?? ""} `}
                                {props.model.name}
                                {hasTypeParameters(props.model) && (
                                    <>
                                        {"<"}
                                        {join(", ", props.model.typeParameters, (item) => item.name)}
                                        {">"}
                                    </>
                                )}
                            </h1>
                        </div>
                    </div>
                </header>
            );
        };
    }
}

/**
 * A near clone of the default theme.
 * 
 * Example:
 * https://github.com/Gerrit0/typedoc-custom-theme-demo/blob/main/src/index.tsx
 * 
 * https://github.com/TypeStrong/typedoc-default-themes/blob/master/src/default/partials/header.hbs
 * 
 */
export class HeaderOverrideTheme extends DefaultTheme {
    private _contextCache?: HeaderOverrideThemeContext;
  
    override getRenderContext(): HeaderOverrideThemeContext {
        this._contextCache ||= new HeaderOverrideThemeContext(
            this,
            this.application.options
        );
        return this._contextCache;
    }
}

export function load(app: Application): void {
    app.renderer.defineTheme("header", HeaderOverrideTheme);
}
