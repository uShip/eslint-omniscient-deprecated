/**
 * @fileoverview Methods that are passed into JSX expression should bind this.
 * @author Richard Simpson
 */
import rule from "../remove-omniscient-import";
import { RuleTester } from "eslint";
import eslintConfig from "./__setup__/eslintRuleConfig";

var ruleTester = new RuleTester(eslintConfig);
ruleTester.run("remove-omniscient-import", rule, {
    valid: [
        {
            code: `<h1 onClick={this.handleClick.bind(this)}>Test</h1>`,
        },

        {
            code: `
import component from "omniscient";

component("Test", () => {});
            `,
        },
    ],
    invalid: [
        {
            code: `
import React from "react";
import component from "omniscient";

class Test extends React.Component {
    render() {}
}
            `,
            errors: [
                {
                    message: "Remove unused reference to omniscient.",
                },
            ],
            output: `
import React from "react";

class Test extends React.Component {
    render() {}
}
            `,
        },
    ],
});
