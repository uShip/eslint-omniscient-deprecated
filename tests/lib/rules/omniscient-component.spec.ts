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
})`.trim(),
            errors: [{
                messageId: "omniscient.usage-deprecated"
            }],
            output: `
import { Component } from 'react';
import component from 'omniscient';

class TestComponent extends Component {
    render() {
        return <h1>Test</h1>;
    }
}

TestComponent.displayName = "TestComponent";`.trim()
        },
        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", (props) => {
    return (<h1>{props.name}</h1>);
})`.trim(),
            errors: [{
                messageId: "omniscient.usage-deprecated"
            }],
            output: `
import { Component } from 'react';
import component from 'omniscient';

class TestComponent extends Component {
    render() {
        const props = this.props;
        return <h1>{props.name}</h1>;
    }
}

TestComponent.displayName = "TestComponent";`.trim()
        },
        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", ({a, b}) => {
    return (<h1>{a}</h1>);
})`.trim(),
            errors: [{
                messageId: "omniscient.usage-deprecated"
            }],
            output: `
import { Component } from 'react';
import component from 'omniscient';

class TestComponent extends Component {
    render() {
        const { a, b } = this.props;
        return <h1>{a}</h1>;
    }
}

TestComponent.displayName = "TestComponent";`.trim()
        },
        
        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", {
    propTypes: {
        label: PropTypes.string
    }
}, ({label}) => {
    return (<h1>{label}</h1>);
})`.trim(),
            errors: [{
                messageId: "omniscient.usage-deprecated"
            }],
            output: `
import { Component } from 'react';
import component from 'omniscient';

class TestComponent extends Component {
    propTypes = {
        label: PropTypes.string
    };

    render() {
        const { label } = this.props;
        return <h1>{label}</h1>;
    }
}

TestComponent.displayName = "TestComponent";`.trim()
        },

        /**********************************************/
        /*   Test Default Props Transform   */
        /**********************************************/
        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", {
    getDefaultProps() {
        return { label: "test" };
    }
}, ({label}) => {
    return (<h1>{label}</h1>);
})`.trim(),
            errors: [{
                messageId: "omniscient.usage-deprecated"
            }],
            output: `
import { Component } from 'react';
import component from 'omniscient';

class TestComponent extends Component {
    defaultProps = { label: "test" };

    render() {
        const { label } = this.props;
        return <h1>{label}</h1>;
    }
}

TestComponent.displayName = "TestComponent";`.trim()
        },

        /**********************************************/
        /*   Test Default State Transform   */
        /**********************************************/
        
        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", {
    getInitialState() {
        return { i: 1 };
    }
}, ({label}) => {
    return (<h1>{label}</h1>);
})`.trim(),
            errors: [{
                messageId: "omniscient.usage-deprecated"
            }],
            output: `
import { Component } from 'react';
import component from 'omniscient';

class TestComponent extends Component {
    constructor(props) {
        super(props);
        this.state = { i: 1 };
    }

    render() {
        const { label } = this.props;
        return <h1>{label}</h1>;
    }
}

TestComponent.displayName = "TestComponent";`.trim()
        }
    ]
});
