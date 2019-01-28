import { fix } from "./setup";

describe("simple component conversions", () => {
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

import component from 'omniscient';

class TestComponent extends Component {
    render() {
        return <h1>Test</h1>;
    }
}

TestComponent.displayName = "TestComponent";`);
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

import component from 'omniscient';

class TestComponent extends Component {
    render() {
        const props = this.props;
        return <h1>{props.name}</h1>;
    }
}

TestComponent.displayName = "TestComponent";`);
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

import component from 'omniscient';

class TestComponent extends Component {
    render() {
        const { a, b } = this.props;
        return <h1>{a}</h1>;
    }
}

TestComponent.displayName = "TestComponent";`);
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
}`);
    });
});
