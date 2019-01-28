/**
 * @fileoverview Usage of omniscient component
 * @author Richard Simpson
 */
import rule from "../../../../lib/rules/omniscient-component";
import { RuleTester } from "eslint";
import eslintConfig from "../eslintRuleConfig";

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
                }`,
        },
    ],
    invalid: [
        /**********************************************/
        /*    Test Wrapped or generated Components    */
        /**********************************************/
        {
            code: `
import component from 'omniscient';

function withProps(Component, props) {
    return component(Component.displayName + '_WithProps', newProps => {
        return <Component {...newProps} {...props} />;
    });
}`.trim(),
            errors: [
                {
                    messageId: "omniscient.usage-deprecated",
                },
            ],
            output: `
import { Component } from 'react';
import component from 'omniscient';

function withProps(Component, props) {
    return (() => {
    class AnonymousComponent extends Component {
        render() {
            const newProps = this.props;
            return <Component {...newProps} {...props} />;
        }
    }

    AnonymousComponent.displayName = "Component.displayName + '_WithProps'";
    return AnonymousComponent;
})();
}`.trim(),
        },

        /**********************************************/
        /*    Respects Options    */
        /**********************************************/
        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", () => {
    return (<h1>Test</h1>);
})`.trim(),
            errors: [
                {
                    messageId: "omniscient.usage-deprecated",
                },
            ],
            options: [{ componentModule: "src/utils/ImmutableComponent", componentImport: "ImmutableComponent" }],
            output: `
import { ImmutableComponent } from 'src/utils/ImmutableComponent';
import component from 'omniscient';

class TestComponent extends ImmutableComponent {
    render() {
        return <h1>Test</h1>;
    }
}

TestComponent.displayName = "TestComponent";`.trim(),
        },

        /**********************************************/
        /*        Test Automatic Function Bind        */
        /**********************************************/

        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", {
    getInitialState() {
        return { i: 1 };
    },
    handleClick(e) {
        e.preventDefault();
    },
    doThing() {
        console.log("asdasd");
    },
    thatThing(a) {
        return a;
    }
}, ({label}) => {    
    const options = {
        onThing: this.doThing,
        thatThing: this.thatThing(1)
    };
    return <button onClick={this.handleClick}>Test</button>;
})`.trim(),
            errors: [
                {
                    messageId: "omniscient.usage-deprecated",
                },
            ],
            output: `
import { Component } from 'react';
import component from 'omniscient';

class TestComponent extends Component {
    constructor(props) {
        super(props);
        this.state = { i: 1 };
    }

    thatThing = a => {
        return a;
    };

    doThing = () => {
        console.log("asdasd");
    };

    handleClick = e => {
        e.preventDefault();
    };

    render() {
        const { label } = this.props;
        const options = {
            onThing: this.doThing,
            thatThing: this.thatThing(1)
        };
        return <button onClick={this.handleClick}>Test</button>;
    }
}

TestComponent.displayName = "TestComponent";`.trim(),
        },
        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", {
    getInitialState() {
        return { i: 1 };
    },
    handleClick(e) {
        e.preventDefault();
    },
    doThing() {
        console.log("asdasd");
    },
    thatThing(a) {
        return a;
    }
}, ({label}) => {    
    const options = {
        onThing: this.doThing,
        thatThing: this.thatThing(1)
    };
    return <button onClick={this.handleClick}>Test</button>;
})`.trim(),
            errors: [
                {
                    messageId: "omniscient.usage-deprecated",
                },
            ],
            options: [{ useClassProperties: false }],
            output: `
import { Component } from 'react';
import component from 'omniscient';

class TestComponent extends Component {
    constructor(props) {
        super(props);
        this.state = { i: 1 };
    }

    thatThing(a) {
        return a;
    }

    doThing() {
        console.log("asdasd");
    }

    handleClick(e) {
        e.preventDefault();
    }

    render() {
        const { label } = this.props;
        const options = {
            onThing: this.doThing.bind(this),
            thatThing: this.thatThing(1)
        };
        return <button onClick={this.handleClick.bind(this)}>Test</button>;
    }
}

TestComponent.displayName = "TestComponent";`.trim(),
        },
    ],
});
