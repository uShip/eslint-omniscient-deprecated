import { fix } from "./setup";

describe("simple component conversions", () => {
    it("should convert render only component", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component(() => {
    return (<h1>Test</h1>);
})`;
        const output = fix(input);
        expect(output).toBeFixed();
        expect(output).toMatchFixOutput(`
import { Component } from 'react';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';

class TestComponent extends Component {
    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        return <h1>Test</h1>;
    }
}`);
    });

    it("should convert simple pure component", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", () => {
    return (<h1>Test</h1>);
})`;
        const output = fix(input);
        expect(output).toBeFixed();
        expect(output).toMatchFixOutput(`
import { Component } from 'react';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';

class TestComponent extends Component {
    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        return <h1>Test</h1>;
    }

    static displayName = "TestComponent";
}`);
    });

    it("should convert component with raw props", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", (props) => {
return (<h1>{props.name}</h1>);
})`;
        const output = fix(input);
        expect(output).toBeFixed();
        expect(output).toMatchFixOutput(`
import { Component } from 'react';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';

class TestComponent extends Component {
    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        const props = this.props;
        return <h1>{props.name}</h1>;
    }

    static displayName = "TestComponent";
}`);
    });

    it("should convert component with destructed props", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", ({a, b}) => {
    return (<h1>{a}</h1>);
})`;
        const output = fix(input);
        expect(output).toBeFixed();
        expect(output).toMatchFixOutput(`
import { Component } from 'react';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';

class TestComponent extends Component {
    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        const { a, b } = this.props;
        return <h1>{a}</h1>;
    }

    static displayName = "TestComponent";
}`);
    });

    it("should handle nameless components", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component({
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
}`);
    });
});
