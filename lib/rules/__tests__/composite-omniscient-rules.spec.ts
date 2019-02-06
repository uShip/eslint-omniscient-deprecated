import { Linter } from "eslint";
import omniscientComponentRule from "../omniscient-component";
import RemoveOmniscientImport from "../remove-omniscient-import";
import eslintRuleConfig from "./__setup__/eslintRuleConfig";

describe("both omniscient rules", () => {
    it("should run both omniscient rule fixes", () => {
        const linter = new Linter();
        linter.defineRule("component-deprecated", omniscientComponentRule);
        linter.defineRule("no-omniscient-import", RemoveOmniscientImport);

        const report = linter.verifyAndFix(
            `import component from "omniscient";

const Test = component("Test", {
    test: 1,
    componentDidMount() {
        this.test = 2;
    }
}, () => {
    return <span>{this.test}</span>
});`,
            {
                ...eslintRuleConfig,
                rules: {
                    ["component-deprecated"]: [
                        "error",
                        {
                            areEqualModule: "ImmutableComponent",
                            areEqualImport: "isEqualImmutable",
                        },
                    ],
                    ["no-omniscient-import"]: ["error"],
                },
            }
        );

        expect(report.fixed).toBeTruthy();
        expect(report.output).toMatchSnapshot();
    });
});
