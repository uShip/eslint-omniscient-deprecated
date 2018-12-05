/**
 * @fileoverview Usage of omniscient component
 * @author Richard Simpson
 */
import rule from "../../../lib/rules/omniscient-component";
import { RuleTester } from "eslint";
import eslintConfig from "./eslintRuleConfig";

var ruleTester = new RuleTester(eslintConfig);
ruleTester.run("omniscient-component", rule, {

    valid: [
        {   
            code: `
                import { Component } from 'react';
                class MyThing extends Component {
                    render() {
                        /*...*/
                    }
                }`
        }   
    ],

    invalid: [
        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", () => {
    return (<h1>Test</h1>);
})`,
            errors: [{
                messageId: "uship.omniscient.import"
            }, {
                messageId: "uship.omniscient.usage"
            }],
            output: `


class TestComponent extends React.Component {
    render() {
        return (<h1>Test</h1>);
    }
}

TestComponent.displayName = 'TestComponent';`
        },
        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", (props) => {
    return (<h1>{props.name}</h1>);
})`,
            errors: [{
                messageId: "uship.omniscient.import"
            }, {
                messageId: "uship.omniscient.usage"
            }],
            output: `


class TestComponent extends React.Component {
    render() {
        const props = this.props;
        return (<h1>{props.name}</h1>);
    }
}

TestComponent.displayName = 'TestComponent';`
        },
        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", ({a, b}) => {
    return (<h1>{a}</h1>);
})`,
            errors: [{
                messageId: "uship.omniscient.import"
            }, {
                messageId: "uship.omniscient.usage"
            }],
            output: `


class TestComponent extends React.Component {
    render() {
        const {a, b} = this.props;
        return (<h1>{a}</h1>);
    }
}

TestComponent.displayName = 'TestComponent';`
        }
    ]
});
