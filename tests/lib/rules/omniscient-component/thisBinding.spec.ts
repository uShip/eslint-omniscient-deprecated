import { fix, withRuleOptions } from "./setup";

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
        expect(report).toMatchFixOutput(`
import { Component } from 'react';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';

class TestComponent extends Component {
    constructor(props) {
        super(props);
        this.state = { i: 1 };
    }

    thatThing = a => {
        return a;
    };

    doThing = () => {
        console.log("asdasd");
    };

    handleClick = e => {
        e.preventDefault();
    };

    shouldComponentUpdate = immutShouldComponentUpdate;

    render() {
        const { label } = this.props;
        const options = {
            onThing: this.doThing,
            thatThing: this.thatThing(1)
        };
        return <button onClick={this.handleClick}>Test</button>;
    }

    static displayName = "TestComponent";
}`);
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
        expect(report).toMatchFixOutput(`
import { Component } from 'react';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';

class TestComponent extends Component {
    constructor(props) {
        super(props);
        this.state = { i: 1 };
    }

    thatThing(a) {
        return a;
    }

    doThing() {
        console.log("asdasd");
    }

    handleClick(e) {
        e.preventDefault();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return immutShouldComponentUpdate(nextProps, nextState);
    }

    render() {
        const { label } = this.props;
        const options = {
            onThing: this.doThing.bind(this),
            thatThing: this.thatThing(1)
        };
        return <button onClick={this.handleClick.bind(this)}>Test</button>;
    }
}

TestComponent.displayName = "TestComponent";`);
    });
});
