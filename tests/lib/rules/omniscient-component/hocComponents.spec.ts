import { fix } from "./setup";

describe("hoc components", () => {
    it("should handle wrapped components", () => {
        const input = `
import component from 'omniscient';

function withProps(Component, props) {
    return component(Component.displayName + '_WithProps', newProps => {
        return <Component {...newProps} {...props} />;
    });
}`;
        const report = fix(input);
        expect(report).toBeFixed();
        expect(report).toMatchFixOutput(`
import { Component } from 'react';
import { immutShouldComponentUpdate } from 'TestModule';

import component from 'omniscient';

function withProps(Component, props) {
    return (() => {
    class AnonymousComponent extends Component {
        shouldComponentUpdate = immutShouldComponentUpdate;

        render() {
            const newProps = this.props;
            return <Component {...newProps} {...props} />;
        }

        static displayName = "Component.displayName + '_WithProps'";
    }

    return AnonymousComponent;
})();
}`);
    });
});
