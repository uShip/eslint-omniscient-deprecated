import { fix, withRuleOptions } from "./__setup__/setup";

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
        expect(report).toMatchSnapshot();
    });

    it("should handle existing default import", () => {
        const customInput = `import React from 'react';${input}`;
        const report = fix(customInput);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });

    it("should handle default import types", () => {
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });

    it("should handle custom import types", () => {
        const report = fix(
            input,
            withRuleOptions({
                componentImport: "MyComponent",
                componentModule: "MyLib",
            })
        );
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });

    it("should handle already present custom import types", () => {
        const customInput = `import MyLib from 'MyLib';${input}`;
        const report = fix(
            customInput,
            withRuleOptions({
                componentImport: "MyComponent",
                componentModule: "MyLib",
            })
        );
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });

    it("should handle double import fixes", () => {
        const report = fix(
            input,
            withRuleOptions({
                memoImport: "memo",
                memoModule: "MyLib",
                areEqualImport: "areEqual",
                areEqualModule: "MyLib",
                passAreEqualToMemo: true,
            })
        );
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });

    it("should handle double import fixes on already present type", () => {
        const customInput = `import MyLib from 'MyLib';${input}`;
        const report = fix(
            customInput,
            withRuleOptions({
                memoImport: "memo",
                memoModule: "MyLib",
                areEqualImport: "areEqual",
                areEqualModule: "MyLib",
                passAreEqualToMemo: true,
            })
        );
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });
});
