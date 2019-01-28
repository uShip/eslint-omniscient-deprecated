/**
 * @fileoverview An eslint rule to lint for, and fix, usages of omniscient.
 * @author Richard Simpson
 */
"use strict";

import omniscientComponentRule from "./rules/omniscient-component";
import jsxBindMethod from "./rules/jsx-bind-method";

const plugin = {
    rules: {
        "component-deprecated": omniscientComponentRule,
        "jsx-bind-method": jsxBindMethod,
    },
};

module.exports = plugin;
export default plugin;
