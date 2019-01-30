import rule, { OmniscientComponentRuleOptions } from "../../../omniscient-component";
import { Linter } from "eslint";
import jestDiff from "jest-diff";
import eslintConfig from "../../__setup__/eslintRuleConfig";

const linter = new Linter();
linter.defineRule("omniscient-component", rule);

export const ruleName = "omniscient-component";
export const omniscientComponentConfig = [
    "error",
    // eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
    {
        areEqualModule: "ImmutableComponent",
        areEqualImport: "isEqualImmutable",
    } as Partial<OmniscientComponentRuleOptions>,
] as ["error", object];

const omniscientConfig = {
    ...eslintConfig,
    ...{
        rules: {
            [ruleName]: omniscientComponentConfig,
        },
    },
};

expect.extend({
    toBeFixed(recieved: Linter.FixReport) {
        if (typeof recieved !== "object" || typeof recieved.fixed !== "boolean") {
            const flip = this.isNot;
            return {
                message: () => `expected to recieve lint report. Got ${this.utils.stringify(recieved)} instead`,
                pass: false || flip,
            };
        }
        if (recieved.fixed) {
            return {
                message: () => `expected linter to not have fixed input`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected linter to have fixed input`,
                pass: false,
            };
        }
    },
    toMatchFixOutput(recieved: Linter.FixReport, output: string) {
        if (typeof recieved !== "object" || typeof recieved.fixed !== "boolean") {
            const flip = this.isNot;
            return {
                message: () => `expected to recieve lint report. Got ${this.utils.stringify(recieved)} instead`,
                pass: false || flip,
            };
        }

        if (!recieved.fixed) {
            const flip = this.isNot;
            return {
                message: () => `expected linter to have fixed output`,
                pass: false || flip,
            };
        }

        const actualOutput = recieved.output.trim();
        const expectedOutput = output.trim();
        const diff = jestDiff(actualOutput, expectedOutput, {
            expand: this.expand,
            aAnnotation: "Fix Output",
            bAnnotation: "Expected",
        });

        const pass = actualOutput === expectedOutput;
        const message = !pass
            ? () =>
                  this.utils.matcherHint("toMatchFixOutput") +
                  "\n\n" +
                  `Expected fix output:\n` +
                  `    ${this.utils.printExpected(expectedOutput)}\n\n` +
                  `Recieved fix output:\n` +
                  `    ${this.utils.printReceived(actualOutput)}` +
                  (diff ? `\n\nDifference:\n\n${diff}` : "")
            : () =>
                  this.utils.matcherHint("toMatchFixOutput") +
                  "\n\n" +
                  `Expected fix output:\n` +
                  `    ${this.utils.printExpected(expectedOutput)}\n\n` +
                  `Recieved fix output:\n` +
                  `    ${this.utils.printReceived(actualOutput)}`;
        return { actual: actualOutput, message, pass };
    },
});

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeFixed(): R;
            toMatchFixOutput(expectedOutput: string): R;
        }
    }
}
/* eslint-enable @typescript-eslint/no-namespace */

interface FixOptions {
    rules?: {
        [ruleName]: ["error", Partial<OmniscientComponentRuleOptions>];
    };
}

const fix = (input: string, options: FixOptions = {}): Linter.FixReport => {
    return linter.verifyAndFix(input, { ...omniscientConfig, ...options });
};

const withRuleOptions = (options: Partial<OmniscientComponentRuleOptions>): FixOptions => {
    const ruleConfig = ["error", { ...omniscientComponentConfig[1], ...options }] as ["error", object];
    return {
        rules: {
            [ruleName]: ruleConfig,
        },
    };
};

export { fix, withRuleOptions };
