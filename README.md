# eslint-plugin-uship-omniscient

An eslint rule to lint for, and fix, usages of omniscient.

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-uship-omniscient`:

```
$ npm install eslint-plugin-uship-omniscient --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-uship-omniscient` globally.

## Usage

Add `uship-omniscient` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": ["uship-omniscient"]
}
```

Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "@uship/omniscient/component-deprecated": ["error"]
    }
}
```

## Supported Rules

### `@uship/omniscient/component-deprecated`

This flags any usages of `omniscient`. It also can fix them to utilize class or function components. There are a lot of knobs to this however and some caveats. Always review the converted code for correctness after.

#### Settings

`// TODO`

#### Notable Caveats

-   Components that pass anything other than object expressions to the mixin parameter will not be fixes. There's no easy way to autofix this, and they should be converted to HOC anyways.
-   The plugin will attempt to handle `render` `this` binding issues, but it's imperfect. You should absolutely review the outputted code if your component passes functions in other components or handlers.
    -   When `useClassProperties`, it'll convert them to lambdas that will automatically capture this. Otherwise it will use a hueristic to attempt to `.bind(this)` where necessary in the `render` body.
-   Depending on the options provided, the outputted component may take multiple forms:
    -   If the component doesn't use children, access `this.state`, or have any complicated mixins (_eg: only uses defaultProps and displayName_), the conversion will attempt to use `memoModule`. It will fallback to `pureComponentImport`, and failing that `componentImport` with `areEqualImport`, and failing that `componentImport`.
    -   If the component has children or accesses `this.state`, but doesn't have any complication mixins, then the conversion will simply output a function component.
    -   If the component has complicated mixins, but doesn't have children or access `this.state`, it'll use `pureComponentImport`. Failing that, `componentImport` with `areEqualImport`. Failing _that_, `componentImport`.
    -   Otherwise, it'll use `componentImport`
    -   If a `shouldComponentUpdate` is specified, it'll always take priority.
