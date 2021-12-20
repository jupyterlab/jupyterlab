import {
    Application,
    DefaultTheme,
    DefaultThemeRenderContext,
    JSX,
    Options,
    PageEvent,
    Reflection
} from "typedoc";

import {
    hasTypeParameters,
    join
} from "typedoc/dist/lib/output/themes/lib";

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
                    <div className="tsd-page-toolbar">
                        <div className="container">
                            <div className="table-wrap">
                                <div className="table-cell" id="tsd-search" data-base={this.relativeURL("./")}>
                                    <div className="field">
                                        <label htmlFor="tsd-search-field" className="tsd-widget search no-caption">
                                            Search
                                        </label>
                                        <input type="text" id="tsd-search-field" />
                                    </div>
            
                                    <ul className="results">
                                        <li className="state loading">Preparing search index...</li>
                                        <li className="state failure">The search index is not available</li>
                                    </ul>
            
                                    <a href={this.relativeURL("index.html")} className="title">
                                        {props.project.name}
                                    </a>
                                </div>
            
                                <div className="table-cell" id="tsd-widgets">
                                    <div id="tsd-filter">
                                        <a href="#" className="tsd-widget options no-caption" data-toggle="options">
                                            Options
                                        </a>
                                        <div className="tsd-filter-group">
                                            <div className="tsd-select" id="tsd-filter-visibility">
                                                <span className="tsd-select-label">All</span>
                                                <ul className="tsd-select-list">
                                                    <li data-value="public">Public</li>
                                                    <li data-value="protected">Public/Protected</li>
                                                    <li data-value="private" className="selected">
                                                        All
                                                    </li>
                                                </ul>
                                            </div>{" "}
                                            <input type="checkbox" id="tsd-filter-inherited" checked={true} />
                                            <label className="tsd-widget" htmlFor="tsd-filter-inherited">
                                                Inherited
                                            </label>
                                            {!this.options.getValue("excludeExternals") && (
                                                <>
                                                    <input type="checkbox" id="tsd-filter-externals" checked={true} />
                                                    <label className="tsd-widget" htmlFor="tsd-filter-externals">
                                                        Externals
                                                    </label>
                                                </>
                                            )}
                                            {!this.options.getValue("excludeNotExported") && (
                                                <>
                                                    <input type="checkbox" id="tsd-filter-externals" checked={true} />
                                                    <label className="tsd-widget" htmlFor="tsd-filter-externals">
                                                        Only exported
                                                    </label>
                                                </>
                                            )}
                                        </div>
                                    </div>
            
                                    <a href="#" className="tsd-widget menu no-caption" data-toggle="menu">
                                        Menu
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="tsd-page-title">
                        <div className="container">
                            <ul className="tsd-breadcrumb">{this.breadcrumb(props.model)}</ul>
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
