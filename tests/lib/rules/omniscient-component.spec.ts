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
    static propTypes = {
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
    static defaultProps = { label: "test" };

    render() {
        const { label } = this.props;
        return <h1>{label}</h1>;
    }
}

TestComponent.displayName = "TestComponent";`.trim()
        },

        {
            code: `
import component from 'omniscient';
import { getDefaultPropsFor } from 'test';

const TestComponent = component("TestComponent", {
    getDefaultProps() {
        const test = 2;
        return getDefaultPropsFor(test);
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
import { getDefaultPropsFor } from 'test';

class TestComponent extends Component {
    static get defaultProps() {
        const test = 2;
        return getDefaultPropsFor(test);
    }

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
        },

        /**********************************************/
        /*   Test nameless components   */
        /**********************************************/
        {
            code: `
import component from 'omniscient';

const TestComponent = component({
    getInitialState() {
        return { i: 1 };
    }
}, ({label}) => {
    return (<h1>{label}</h1>);
})`.trim(),
            errors: [{ messageId: "omniscient.usage-deprecated" }],
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
}`.trim(),
        },

        /**********************************************/
        /*   Test Unsuppored mixins   */
        /**********************************************/
        {
            code: `
            import component from 'omniscient';
            import testMixin from 'test';
            
            const TestComponent = component("TestComponent", [{
                getInitialState() {
                    return { i: 1 };
                }
            }, testMixin], ({label}) => {
                return (<h1>{label}</h1>);
            })`,
            errors: [{ messageId: "omniscient.usage-deprecated" }],
        },

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
            errors: [{
                messageId: "omniscient.usage-deprecated"
            }],
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
}`.trim()
        },

        /**********************************************/
        /*    Test Lambda Renders   */
        /**********************************************/
        {
            code: `
import component from 'omniscient';

const TestComponent = component("TestComponent", ({label}) => <h1>{label}</h1>);
`.trim(),
            errors: [{ messageId: "omniscient.usage-deprecated" }],
            output: `
import { Component } from 'react';
import component from 'omniscient';

class TestComponent extends Component {
    render() {
        const { label } = this.props;
        return <h1>{label}</h1>;
    }
}

TestComponent.displayName = "TestComponent";`.trim(),
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
            errors: [{
                messageId: "omniscient.usage-deprecated"
            }],
            options: [{ componentModule: 'src/utils/ImmutableComponent', componentImport: 'ImmutableComponent' }],
            output: `
import { ImmutableComponent } from 'src/utils/ImmutableComponent';
import component from 'omniscient';

class TestComponent extends ImmutableComponent {
    render() {
        return <h1>Test</h1>;
    }
}

TestComponent.displayName = "TestComponent";`.trim()
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

TestComponent.displayName = "TestComponent";`.trim()
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
            errors: [{
                messageId: "omniscient.usage-deprecated"
            }],
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

TestComponent.displayName = "TestComponent";`.trim()
        },
    ]
});
