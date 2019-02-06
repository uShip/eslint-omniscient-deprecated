/**
 * @fileoverview An eslint rule to lint for, and fix, usages of omniscient.
 * @author Richard Simpson
 */
"use strict";

import omniscientComponentRule from "./rules/omniscient-component";

const plugin = {
    rules: {
        "component-deprecated": omniscientComponentRule,
    },
};

module.exports = plugin;
export default plugin;
