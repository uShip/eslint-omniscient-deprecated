import { fix } from "./__setup__/setup";

describe("render conversion", () => {
    it("shouldn't handle rest argument as props", () => {
        const input = `
    import component from 'omniscient';

    const TestComponent = component((...test) => {
        return (<h1 {...test}>Test</h1>);
    })`;
        const report = fix(input);
        expect(report).not.toBeFixed();
    });
    it("should handle rest on props destructure", () => {
        const input = `
    import component from 'omniscient';

    const TestComponent = component(({ a , ...test}) => {
        return (<h1 {...test}>Test</h1>);
    })`;
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });
});
