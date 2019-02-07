import { FunctionExpression, ArrowFunctionExpression, ObjectExpression, Literal, Identifier } from "estree";
import { SourceCode } from "eslint";

export interface ComponentInformation {
    name: string;
    wrapped: boolean;
    properties: ComponentProperty[];
    renderBody: string;
    areEqualFunction: string | null;
}

export type Component = ClassComponentInformation | FunctionComponentInformation;

export type ComponentProperty = ComponentMethodProperty | ComponentValueProperty;

export interface PropertyInformation {
    key: {
        text: string;
        isComputedIdentifier?: boolean;
    };
    type: string;
    isStatic: boolean;
    getter?: boolean;
    rawText?: string;
    leadingComments?: string[];
    trailingComments?: string[];
}

export interface ComponentValueProperty extends PropertyInformation {
    type: "Value";
    body?: ObjectExpression | Literal | Identifier | ArrowFunctionExpression;
}

export interface ComponentMethodProperty extends PropertyInformation {
    type: "Function";
    body?: FunctionExpression;
}

export interface ClassComponentInformation extends ComponentInformation {
    extendsName: string;
}

export interface FunctionComponentInformation extends ComponentInformation {
    props: string;
}

interface GeneratorContext {
    sourceCode: SourceCode;
    isUnmemoizable: boolean;
    canUseClassProperties?: boolean;
}

function lc(property: PropertyInformation): string {
    return property.leadingComments && property.leadingComments.length > 0
        ? property.leadingComments.join("\n") + "\n"
        : "";
}

function tc(property: PropertyInformation): string {
    return property.trailingComments && property.trailingComments.length > 0
        ? property.trailingComments.join("\n")
        : "";
}

function isConstructorProperty(property: ComponentProperty, canUseClassProperties?: boolean): boolean {
    if (canUseClassProperties === false) {
        return property.type !== "Function" || property.key.isComputedIdentifier === true;
    }
    return false;
}

function getBodyText({ sourceCode, canUseClassProperties }: GeneratorContext, prop: ComponentProperty): string {
    if (prop.rawText) {
        return prop.rawText;
    }
    if (prop.type === "Function" && !prop.getter === true) {
        if (canUseClassProperties) {
            return sourceCode.getText(prop.body).replace(/\) \{/, ") => {");
        }
    }
    return sourceCode.getText(prop.body);
}

function getConstructorProperty(context: GeneratorContext, property: ComponentProperty): string {
    const assigment = property.key.isComputedIdentifier ? `this${property.key.text}` : `this.${property.key.text}`;
    return `${lc(property)}${assigment} = ${getBodyText(context, property)}${tc(property)}`;
}

function getBodyProperty(context: GeneratorContext, property: ComponentProperty): string {
    const lcLines = lc(property);
    const tcLines = tc(property);
    if (property.type === "Value") {
        return `${lcLines}${property.key.text} = ${getBodyText(context, property)}${tcLines}`;
    } else {
        if (context.canUseClassProperties) {
            return `${lcLines}${property.key.text} = ${getBodyText(context, property)}${tcLines}`;
        }
        return `${lcLines}${property.key.text}${getBodyText(context, property)}${tcLines}`;
    }
}

function getStaticProperty(
    context: GeneratorContext,
    componentName: string,
    property: ComponentProperty,
    isClassProperty: boolean
): string {
    if (!isClassProperty) {
        let key = property.key.text;
        if (key.startsWith("[") && key.endsWith("]")) {
            key = key.slice(1, key.length - 1);
        }
        if (property.getter || property.key.isComputedIdentifier) {
            let propBody = lc(property);
            propBody += `Object.defineProperty(${componentName}, ${key}, {`;
            if (property.getter) {
                propBody += `\n    get${getBodyText(context, property)}`;
            } else {
                propBody += `\n    value: ${getBodyText(context, property)}`;
            }
            propBody += `\n});${tc(property)}`;
            return propBody;
        } else {
            let valueBody = getBodyText(context, property);
            if (property.body && property.body.type === "FunctionExpression") {
                valueBody = `function ${valueBody}`;
            }
            return `${lc(property)}${componentName}.${property.key.text} = ${valueBody};${tc(property)}`;
        }
    } else {
        return `${lc(property)}static ${property.getter ? "get " : ""}${property.key.text}${
            property.type === "Value" ? " = " : ""
        }${getBodyText(context, property)};${tc(property)}`;
    }
}

function generateClassComponent(context: GeneratorContext, classInfo: ClassComponentInformation): string {
    const classBody: string[] = [];
    if (classInfo.wrapped) {
        classBody.push(`(() => {`);
    }

    const { name, extendsName, properties, renderBody, areEqualFunction } = classInfo;
    const { canUseClassProperties } = context;

    // If we have an isEqual question and there isn't an already implemented shouldComponentUpdate, provide our own.
    let shouldUpdateBody: string | null = null;
    if (!context.isUnmemoizable && areEqualFunction && !properties.some(p => p.key.text === "shouldComponentUpdate")) {
        shouldUpdateBody = `shouldComponentUpdate(nextProps, nextState) {\n
                return !(${areEqualFunction}(this.props, nextProps) && ((!oldState && !newState) || ${areEqualFunction}(this.state, nextState)));\n
            }`;
    }

    classBody.push(`class ${name} extends ${extendsName} {`);

    const constructorProperties = properties.filter(
        p => !p.isStatic && isConstructorProperty(p, context.canUseClassProperties)
    );
    if (constructorProperties.length > 0) {
        classBody.push("constructor(props) {");
        classBody.push("super(props);");
        for (const prop of constructorProperties) {
            classBody.push(getConstructorProperty(context, prop));
        }
        classBody.push("}");
        classBody.push("");
    }

    let instanceProperties = properties.filter(p => !p.isStatic && !constructorProperties.includes(p));
    let staticProperties = properties.filter(p => p.isStatic);
    let classStaticProperties = canUseClassProperties ? staticProperties : [];
    let externalStaticProperties = !canUseClassProperties ? staticProperties : [];

    while (classStaticProperties.length > 0) {
        const staticProp = classStaticProperties.pop()!;
        classBody.push(getStaticProperty(context, name, staticProp, true));
        if (classStaticProperties.length > 0) {
            classBody.push("");
        }
    }

    if (shouldUpdateBody) {
        classBody.push("");
        classBody.push(...shouldUpdateBody.split("\n"));
    }

    while (instanceProperties.length > 0) {
        if (/\s/.test(classBody[classBody.length - 1])) {
            classBody.push("");
        }
        const next = instanceProperties.pop()!;
        classBody.push(getBodyProperty(context, next));
        if (instanceProperties.length > 0) {
            classBody.push("");
        }
    }

    classBody.push(`\nrender() ${renderBody}`);

    classBody.push("}");
    classBody.push("");

    for (const staticProp of externalStaticProperties) {
        classBody.push(getStaticProperty(context, name, staticProp, false));
    }

    if (classInfo.wrapped) {
        classBody.push(`return ${name};`);
        classBody.push("})()");
    }
    return classBody.join("\n");
}

function generateFunctionComponent(
    context: GeneratorContext,
    functionInfo: FunctionComponentInformation,
    memo: string | null
): string {
    const funcBody: string[] = [];
    if (functionInfo.wrapped) {
        funcBody.push(`(() => {`);
    }

    const { name, props, properties, renderBody, areEqualFunction } = functionInfo;

    if (!properties.every(p => p.isStatic)) {
        throw new Error("A functional component cannot have non-static properties.");
    }

    if (memo) {
        funcBody.push(`const ${name} = ${memo}(function ${name}(${props}) ${renderBody}`);
    } else {
        funcBody.push(`function ${name}(${props}) ${renderBody}`);
    }

    if (memo) {
        if (areEqualFunction) {
            funcBody.push(`${funcBody.pop()}, ${areEqualFunction});`);
        } else {
            funcBody.push(`${funcBody.pop()});`);
        }
    }

    for (const staticProp of properties) {
        funcBody.push(getStaticProperty(context, name, staticProp, false));
    }

    if (functionInfo.wrapped) {
        funcBody.push(`return ${name};`);
        funcBody.push("})()");
    }
    return funcBody.join("\n");
}

export { generateClassComponent, generateFunctionComponent };
