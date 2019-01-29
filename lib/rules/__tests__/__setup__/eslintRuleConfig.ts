export default {
    env: {
        browser: true,
        node: true,
        es6: true,
    },
    parserOptions: {
        ecmaVersion: 2018 as 2018,
        sourceType: "module" as "module",
        ecmaFeatures: {
            jsx: true,
        },
    },
    plugins: ["react"],
};
