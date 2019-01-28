import { fix } from "./setup";

describe("special cased properties", () => {
    it("should handle propTypes", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", {
    propTypes: {
        label: PropTypes.string
    }
}, ({label}) => {
    return (<h1>{label}</h1>);
})`;
        const output = fix(input);
        expect(output).toBeFixed();
        expect(output).toMatchFixOutput(`
import { Component } from 'react';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';

class TestComponent extends Component {
    static propTypes = {
        label: PropTypes.string
    };

    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        const { label } = this.props;
        return <h1>{label}</h1>;
    }

    static displayName = "TestComponent";
}`);
    });

    describe("defaultProps", () => {
        it("should handle default props object", () => {
            const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", {
    getDefaultProps() {
        return { label: "test" };
    }
}, ({label}) => {
    return (<h1>{label}</h1>);
})`;
            const output = fix(input);
            expect(output).toBeFixed();
            expect(output).toMatchFixOutput(`
import { Component } from 'react';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';

class TestComponent extends Component {
    static defaultProps = { label: "test" };

    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        const { label } = this.props;
        return <h1>{label}</h1>;
    }

    static displayName = "TestComponent";
}`);
        });

        it("should handle default props method", () => {
            const input = `
import component from 'omniscient';
import { getDefaultPropsFor } from 'test';

const TestComponent = component("TestComponent", {
    getDefaultProps() {
        const test = 2;
        return getDefaultPropsFor(test);
    }
}, ({label}) => {
    return (<h1>{label}</h1>);
})`;
            const output = fix(input);
            expect(output).toBeFixed();
            expect(output).toMatchFixOutput(`
import { Component } from 'react';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';
import { getDefaultPropsFor } from 'test';

class TestComponent extends Component {
    static get defaultProps() {
        const test = 2;
        return getDefaultPropsFor(test);
    }

    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        const { label } = this.props;
        return <h1>{label}</h1>;
    }

    static displayName = "TestComponent";
}`);
        });
    });

    it("should handle initial state", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", {
    getInitialState() {
        return { i: 1 };
    }
}, ({label}) => {
    return (<h1>{label}</h1>);
})`;
        const output = fix(input);
        expect(output).toBeFixed();
        expect(output).toMatchFixOutput(`
import { Component } from 'react';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';

class TestComponent extends Component {
    constructor(props) {
        super(props);
        this.state = { i: 1 };
    }

    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        const { label } = this.props;
        return <h1>{label}</h1>;
    }

    static displayName = "TestComponent";
}`);
    });
});
