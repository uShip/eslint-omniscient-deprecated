import { fix, withRuleOptions } from "./__setup__/setup";

describe("simple component conversions", () => {
    it("should convert render only component", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component(() => {
    return (<h1>Test</h1>);
})`;
        const output = fix(input);
        expect(output).toBeFixed();
        expect(output).toMatchSnapshot();
    });

    it("should convert simple pure component", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", () => {
    return (<h1>Test</h1>);
})`;
        const output = fix(input);
        expect(output).toBeFixed();
        expect(output).toMatchSnapshot();
    });

    it("should convert simple pure component to function when has memo", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", () => {
    return (<h1>Test</h1>);
})`;
        const output = fix(
            input,
            withRuleOptions({
                memoImport: "memo",
                memoModule: "react",
                passAreEqualToMemo: false,
            })
        );
        expect(output).toBeFixed();
        expect(output).toMatchSnapshot();
    });

    it("should convert simple component to function when has memo", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", ({test}) => {
    return (<h1>{test}</h1>);
})`;
        const output = fix(
            input,
            withRuleOptions({
                memoImport: "memo",
                memoModule: "react",
                passAreEqualToMemo: false,
            })
        );
        expect(output).toBeFixed();
        expect(output).toMatchSnapshot();
    });

    it("should convert component with raw props", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", (props) => {
return (<h1>{props.name}</h1>);
})`;
        const output = fix(input, withRuleOptions({ passAreEqualToMemo: false }));
        expect(output).toBeFixed();
        expect(output).toMatchSnapshot();
    });

    it("should convert component with destructed props", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", ({a, b}) => {
    return (<h1>{a}</h1>);
})`;
        const output = fix(input);
        expect(output).toBeFixed();
        expect(output).toMatchSnapshot();
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
        expect(output).toMatchSnapshot();
    });
});
