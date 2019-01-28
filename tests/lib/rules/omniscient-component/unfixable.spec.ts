import { fix } from "./setup";

describe("known unfixable code", () => {
    it("shouldn't fix components with multiple mixins", () => {
        const input = `
import component from 'omniscient';
import testMixin from 'test';

const TestComponent = component("TestComponent", [{
    getInitialState() {
        return { i: 1 };
    }
}, testMixin], ({label}) => {
    return (<h1>{label}</h1>);
})`;
        const output = fix(input);
        expect(output).not.toBeFixed();
    });
});
