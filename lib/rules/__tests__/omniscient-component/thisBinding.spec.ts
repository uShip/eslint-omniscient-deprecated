import { fix, withRuleOptions } from "./__setup__/setup";

describe("this binding", () => {
    it("should handle this in render func", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", {
    getInitialState() {
        return { i: 1 };
    },
    handleClick(e) {
        e.preventDefault();
    },
    doThing() {
        console.log("asdasd");
    },
    thatThing(a) {
        return a;
    }
}, ({label}) => {
    const options = {
        onThing: this.doThing,
        thatThing: this.thatThing(1)
    };
    return <button onClick={this.handleClick}>Test</button>;
})`;
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });

    it("should handle this in render func without class props", () => {
        const input = `
import component from 'omniscient';

const TestComponent = component("TestComponent", {
    getInitialState() {
        return { i: 1 };
    },
    handleClick(e) {
        e.preventDefault();
    },
    doThing() {
        console.log("asdasd");
    },
    thatThing(a) {
        return a;
    }
}, ({label}) => {
    const options = {
        onThing: this.doThing,
        thatThing: this.thatThing(1)
    };
    return <button onClick={this.handleClick}>Test</button>;
})`;
        const report = fix(
            input,
            withRuleOptions({
                useClassProperties: false,
            })
        );
        expect(report).toBeFixed();
        expect(report).toMatchSnapshot();
    });
});
