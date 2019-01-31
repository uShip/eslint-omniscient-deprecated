import { fix } from "./__setup__/setup";

describe("temp", () => {
    it("test", () => {
        const input = `
import component from "omniscient";

component((props) => {
    const child = props.children;
});
`;
        fix(input);
    });
    it("test", () => {
        const input = `
import component from "omniscient";

component((props) => {
    const { children } = props;
});
`;
        fix(input);
    });
    it("test", () => {
        const input = `
import component from "omniscient";

component((props) => {
    const test = props["children"];
});
`;
        fix(input);
    });
    it("test", () => {
        const input = `
import component from "omniscient";

component((props) => {
    const test = props[thing];
});
`;
        fix(input);
    });
});
