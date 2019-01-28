import { fix } from "./setup";

describe("import types", () => {
    const input = `
import component from 'omniscient';

const TestComponent = component(() => {
    return (<h1>Test</h1>);
})`;

    it("should handle existing named import", () => {
        const customInput = `import { Component } from 'react';${input}`;
        const report = fix(customInput);
        expect(report).toBeFixed();
        expect(report).toMatchFixOutput(`
import { immutShouldComponentUpdate } from 'TestModule';
import { Component } from 'react';
import component from 'omniscient';

class TestComponent extends Component {
    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        return <h1>Test</h1>;
    }
}`);
    });

    it("should handle existing default import", () => {
        const customInput = `import React from 'react';${input}`;
        const report = fix(customInput);
        expect(report).toBeFixed();
        expect(report).toMatchFixOutput(`
import { immutShouldComponentUpdate } from 'TestModule';
import React from 'react';
import component from 'omniscient';

class TestComponent extends React.Component {
    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        return <h1>Test</h1>;
    }
}`);
    });

    it("should handle default import types", () => {
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchFixOutput(`
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

    it("should handle custom import types", () => {
        const report = fix(input, {
            rules: {
                "omniscient-component": [
                    "error",
                    {
                        componentImport: "MyComponent",
                        componentModule: "MyLib",
                        shouldUpdateImport: "immutShouldComponentUpdate",
                        shouldUpdateModule: "TestModule",
                    },
                ],
            },
        });
        expect(report).toBeFixed();
        expect(report).toMatchFixOutput(`
import { MyComponent } from 'MyLib';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';

class TestComponent extends MyComponent {
    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        return <h1>Test</h1>;
    }
}`);
    });

    it("should handle already present custom import types", () => {
        const customInput = `import MyLib from 'MyLib';${input}`;
        const report = fix(customInput, {
            rules: {
                "omniscient-component": [
                    "error",
                    {
                        componentImport: "MyComponent",
                        componentModule: "MyLib",
                        shouldUpdateImport: "immutShouldComponentUpdate",
                        shouldUpdateModule: "TestModule",
                    },
                ],
            },
        });
        expect(report).toBeFixed();
        expect(report).toMatchFixOutput(`
import { immutShouldComponentUpdate } from 'TestModule';
import MyLib from 'MyLib';
import component from 'omniscient';

class TestComponent extends MyLib.MyComponent {
    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        return <h1>Test</h1>;
    }
}`);
    });
});
