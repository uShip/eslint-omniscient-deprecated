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
    "plugins": [
        "uship-omniscient"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "uship-omniscient/rule-name": 2
    }
}
```

## Supported Rules

* Fill in provided rules here





