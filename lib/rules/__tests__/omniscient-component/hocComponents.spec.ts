import { fix } from "./__setup__/setup";

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
        expect(report).toMatchSnapshot();
    });
});
