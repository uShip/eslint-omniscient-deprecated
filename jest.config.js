module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    globals: {
        "ts-jest": {
            diagnostics: {
                pathRegex: /\.(spec|test)\.ts$/,
                ignoreCodes: [7016],
            },
        },
    },
    testPathIgnorePatterns: ["/node_modules/", "__setup__", "/dist/"],
};
