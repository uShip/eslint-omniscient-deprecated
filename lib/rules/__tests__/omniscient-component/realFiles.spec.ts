import fs from "fs";
import path from "path";
import { fix, withRuleOptions } from "./__setup__/setup";

describe("real files", () => {
    fs.readdirSync(path.join(__dirname, "__setup__")).forEach(file => {
        if (!file.endsWith(".in.js")) {
            return;
        }

        const fullPath = path.join(__dirname, "__setup__", file);
        const filename = path.basename(file, ".in.js");

        it(filename, () => {
            const input = fs.readFileSync(fullPath, "UTF-8");
            let extraOptions = {};
            const setupFile = path.join(__dirname, "__setup__", `${filename}.setup.js`);
            if (fs.existsSync(setupFile)) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const setupModule = require(setupFile);
                extraOptions = withRuleOptions((setupModule.default || setupModule)());
            }
            const report = fix(input, extraOptions);
            const ouputFilePath = path.join(__dirname, "__setup__", `${filename}.out.js`);
            if (!fs.existsSync(ouputFilePath)) {
                fs.writeFileSync(ouputFilePath, report.output);
            } else {
                const expectedOutput = fs.readFileSync(ouputFilePath).toString("UTF-8");
                expect(report.messages).toHaveLength(0);
                expect(report).toMatchFixOutput(expectedOutput);
            }
        });
    });
});
