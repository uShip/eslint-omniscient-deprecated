module.exports = {
    env: {
        browser: true,
        node: true,
        es6: true,
    },
    extends: ["plugin:@typescript-eslint/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        }
    },
    plugins: ["@typescript-eslint"],
    rules: {
        // Handled by Prettier
        indent: ["off"],
        "linebreak-style": ["off"],
        "@typescript-eslint/indent": ["off"],
        quotes: ["off"],
        semi: ["off"],
        // Both of these are used a lot due to eslint typings
        "@typescript-eslint/no-non-null-assertion": ["off"],
        "@typescript-eslint/no-explicit-any": ["off"],
    }
};
