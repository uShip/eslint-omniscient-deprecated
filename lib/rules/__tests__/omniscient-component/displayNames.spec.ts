import { fix } from "./__setup__/setup";

describe("omniscient fixer", () => {
    it("should raw no display name", () => {
        const input = `
import component from 'omniscient';
const Test = component(() => {})`;
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });

    it("should string display name", () => {
        const input = `
import component from 'omniscient';
const Test = component('a', () => {})`;
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });

    it("should template display name", () => {
        const input = `
import component from 'omniscient';
let b = "b";
const Test = component(\`a\${b}\`, () => {})`;
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });

    it("should binary display name", () => {
        const input = `
import component from 'omniscient';
let b = "b";
const Test = component('a' + b, () => {})`;
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });
});
