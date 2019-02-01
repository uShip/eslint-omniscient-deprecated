import {
    ClassComponentInformation,
    generateClassComponent,
    FunctionComponentInformation,
    generateFunctionComponent,
    ComponentProperty,
} from "../generateComponent";
import { SourceCode } from "eslint";

describe("generateComponent", () => {
    const mockSource = { sourceCode: (null as any) as SourceCode, canUseClassProperties: true };

    const displayName: ComponentProperty = {
        type: "Value",
        isStatic: true,
        key: { text: "displayName" },
        rawText: "'Test'",
    };

    const getAProp: ComponentProperty = {
        type: "Function",
        isStatic: false,
        key: { text: "getA" },
        rawText: "() => { return <h1>Test</h1>; }",
    };

    it("should generate class component", () => {
        const stateProp: ComponentProperty = {
            type: "Value",
            isStatic: false,
            key: { text: "state" },
            rawText: "{a : 1}",
        };
        const classDefinition: ClassComponentInformation = {
            name: "Test",
            wrapped: false,
            properties: [stateProp, displayName, getAProp],
            renderBody: "{ return this.getA(); }",
            areEqualFunction: "is",
            extendsName: "Component",
        };

        const output = generateClassComponent(mockSource, classDefinition);
        expect(output).toMatchSnapshot();
    });

    it("should generate wrapped class component", () => {
        const classDefinition: ClassComponentInformation = {
            name: "Test",
            wrapped: true,
            properties: [displayName],
            renderBody: "{ return null; }",
            areEqualFunction: "is",
            extendsName: "Component",
        };

        const output = generateClassComponent(mockSource, classDefinition);
        expect(output).toMatchSnapshot();
    });

    it("should generate class component without class properties", () => {
        const stateProp: ComponentProperty = {
            type: "Value",
            isStatic: false,
            key: { text: "state" },
            rawText: "{a : 1}",
        };
        const classDefinition: ClassComponentInformation = {
            name: "Test",
            wrapped: false,
            properties: [displayName, stateProp, getAProp],
            renderBody: "{ return this.getA().bind(this); }",
            areEqualFunction: "is",
            extendsName: "Component",
        };

        const output = generateClassComponent(mockSource, classDefinition);
        expect(output).toMatchSnapshot();
    });

    it("should generate function component", () => {
        const funcDefinition: FunctionComponentInformation = {
            name: "Test",
            wrapped: false,
            properties: [displayName],
            props: "{a}",
            renderBody: "{ return a; }",
            areEqualFunction: "is",
        };

        const output = generateFunctionComponent(mockSource, funcDefinition, null);
        expect(output).toMatchSnapshot();
    });

    it("should generate wrapped function component", () => {
        const funcDefinition: FunctionComponentInformation = {
            name: "Test",
            wrapped: true,
            properties: [displayName],
            props: "{a}",
            renderBody: "{ return a; }",
            areEqualFunction: "is",
        };

        const output = generateFunctionComponent(mockSource, funcDefinition, null);
        expect(output).toMatchSnapshot();
    });

    it("should generate memoized function component", () => {
        const funcDefinition: FunctionComponentInformation = {
            name: "Test",
            wrapped: false,
            properties: [displayName],
            props: "{a}",
            renderBody: "{ return a; }",
            areEqualFunction: "is",
        };

        const output = generateFunctionComponent(mockSource, funcDefinition, "React.memo");
        expect(output).toMatchSnapshot();
    });
});
