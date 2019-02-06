/**
 * @fileoverview An eslint rule to lint for, and fix, usages of omniscient.
 * @author Richard Simpson
 */
"use strict";

import omniscientComponentRule from "./rules/omniscient-component";
import RemoveOmniscientImport from "./rules/remove-omniscient-import";

const plugin = {
    rules: {
        "component-deprecated": omniscientComponentRule,
        "no-omniscient-import": RemoveOmniscientImport,
    },
};

module.exports = plugin;
export default plugin;
