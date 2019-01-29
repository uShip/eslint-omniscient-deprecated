import {
    ClassInformation,
    generateClassComponent,
    FunctionInformation,
    generateFunctionComponent,
} from "../generateComponent";

describe("generateComponent", () => {
    it("should generate class component", () => {
        const classDefinition: ClassInformation = {
            name: "Test",
            wrapped: false,
            staticProperties: ["displayName = 'Test';"],
            renderBody: "{ return this.getA(); }",
            areEqualFunction: "is",
            extendsName: "Component",
            constructorLines: [`this.state = {a : 1};`],
            instanceProperties: [`getA = () => { return <h1>Test</h1>; };`],
        };

        const output = generateClassComponent(classDefinition, true);
        expect(output).toMatchSnapshot();
    });

    it("should generate wrapped class component", () => {
        const classDefinition: ClassInformation = {
            name: "Test",
            wrapped: true,
            staticProperties: ["displayName = 'Test';"],
            renderBody: "{ return null; }",
            areEqualFunction: "is",
            extendsName: "Component",
            constructorLines: [],
            instanceProperties: [],
        };

        const output = generateClassComponent(classDefinition, true);
        expect(output).toMatchSnapshot();
    });

    it("should generate class component without class properties", () => {
        const classDefinition: ClassInformation = {
            name: "Test",
            wrapped: false,
            staticProperties: ["displayName = 'Test';"],
            renderBody: "{ return this.getA().bind(this); }",
            areEqualFunction: "is",
            extendsName: "Component",
            constructorLines: [`this.state = {a : 1};`],
            instanceProperties: [`getA() { return <h1>Test</h1>; };`],
        };

        const output = generateClassComponent(classDefinition, false);
        expect(output).toMatchSnapshot();
    });

    it("should generate function component", () => {
        const funcDefinition: FunctionInformation = {
            name: "Test",
            wrapped: false,
            staticProperties: ["displayName = 'Test';"],
            props: "{a}",
            renderBody: "{ return a; }",
            areEqualFunction: "is",
        };

        const output = generateFunctionComponent(funcDefinition, null);
        expect(output).toMatchSnapshot();
    });

    it("should generate wrapped function component", () => {
        const funcDefinition: FunctionInformation = {
            name: "Test",
            wrapped: true,
            staticProperties: ["displayName = 'Test';"],
            props: "{a}",
            renderBody: "{ return a; }",
            areEqualFunction: "is",
        };

        const output = generateFunctionComponent(funcDefinition, null);
        expect(output).toMatchSnapshot();
    });

    it("should generate memoized function component", () => {
        const funcDefinition: FunctionInformation = {
            name: "Test",
            wrapped: false,
            staticProperties: ["displayName = 'Test';"],
            props: "{a}",
            renderBody: "{ return a; }",
            areEqualFunction: "is",
        };

        const output = generateFunctionComponent(funcDefinition, "React.memo");
        expect(output).toMatchSnapshot();
    });
});
