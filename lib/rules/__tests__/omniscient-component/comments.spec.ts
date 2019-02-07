import { fix } from "./__setup__/setup";

describe("comments", () => {
    it("single line comments should be included", () => {
        const input = `
import component from 'omniscient';

const Test = component({
    // This is a
    a: 1
}, () => {})`;
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });

    it("block comments should be included", () => {
        const input = `
import component from 'omniscient';

const Test = component({
    /*
     * Block!
     */
    a: 1
}, () => {})`;
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });

    it("mix and match comments should be included", () => {
        const input = `
import component from 'omniscient';

const Test = component({
    // This is a
    /*
     * Block!
     */
    a: 1
}, () => {})`;
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });
    it("trailing single line comments should be included", () => {
        const input = `
import component from 'omniscient';

const Test = component({

    a: 1 // This is a
}, () => {})`;
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });
});
