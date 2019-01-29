import { fix } from "./__setup__/setup";

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
        expect(output).toMatchSnapshot();
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
            expect(output).toMatchSnapshot();
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
            expect(output).toMatchSnapshot();
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
        expect(output).toMatchSnapshot();
    });
});
