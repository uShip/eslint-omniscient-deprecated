/**
 * @fileoverview Methods that are passed into JSX expression should bind this.
 * @author Richard Simpson
 */
import rule from "../../../lib/rules/jsx-bind-method";
import { RuleTester } from "eslint";
import eslintConfig from "./eslintRuleConfig";

var ruleTester = new RuleTester(eslintConfig);
ruleTester.run("jsx-bind-method", rule, {
    valid: [
        {
            code: `<h1 onClick={this.handleClick.bind(this)}>Test</h1>`
        },
        
        {
            code: `<h1 doTheThing={this.handleThing}>Test</h1>`
        }
    ],
    invalid: [
        {
            code: "<h1 onClick={this.handleClick}>Test</h1>",
            errors: [{
                messageId: "omniscient.conversion-issues.jsx-bind"
            }],
            output: `<h1 onClick={this.handleClick.bind(this)}>Test</h1>`
        }
    ]
});
