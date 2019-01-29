import { fix } from "./__setup__/setup";

describe("no fix required", () => {
    it("non usage should require no fix", () => {
        const input = `
        import { Component } from 'react';
        class MyThing extends Component {
            render() {
                /*...*/
            }
        }`;
        const report = fix(input);
        expect(report).not.toBeFixed();
    });
});
