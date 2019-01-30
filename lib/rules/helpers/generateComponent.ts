export interface ComponentInformation {
    name: string;
    wrapped: boolean;
    staticProperties: string[];
    renderBody: string;
    areEqualFunction: string | null;
}

export interface ClassInformation extends ComponentInformation {
    extendsName: string;
    constructorLines: string[];
    instanceProperties: string[];
}

export interface FunctionInformation extends ComponentInformation {
    props: string;
}

function generateClassComponent(classInfo: ClassInformation, canUseClassProperties: boolean): string {
    const classBody: string[] = [];
    if (classInfo.wrapped) {
        classBody.push(`(() => {`);
    }

    const {
        name,
        extendsName,
        constructorLines,
        instanceProperties,
        staticProperties,
        renderBody,
        areEqualFunction,
    } = classInfo;

    if (areEqualFunction) {
        const shouldUpdateBody: string[] = [];
        shouldUpdateBody.push(`shouldComponentUpdate(nextProps, nextState) {`);
        shouldUpdateBody.push(
            `    return !(${areEqualFunction}(this.props, nextProps) && ((!oldState && !newState) || ${areEqualFunction}(this.state, nextState)));`
        );
        shouldUpdateBody.push(`}`);
        instanceProperties.unshift(shouldUpdateBody.join("\n"));
    }
    instanceProperties.unshift(`render() ${renderBody}`);

    classBody.push(`class ${name} extends ${extendsName} {`);

    if (constructorLines.length > 0) {
        classBody.push("constructor(props) {");
        classBody.push("super(props);");
        for (const constructorLine of constructorLines) {
            classBody.push(constructorLine);
        }
        classBody.push("}");
        classBody.push("");
    }

    if (canUseClassProperties) {
        while (staticProperties.length > 0) {
            const staticProp = staticProperties.pop()!;
            instanceProperties.unshift(`static ${staticProp}`);
        }
    }

    while (instanceProperties.length > 0) {
        const next = instanceProperties.pop()!;
        classBody.push(next);
        if (instanceProperties.length > 0) {
            classBody.push("");
        }
    }

    classBody.push("}");
    classBody.push("");

    if (!canUseClassProperties) {
        for (const staticProp of staticProperties) {
            classBody.push(`${name}.${staticProp}`);
        }
    }

    if (classInfo.wrapped) {
        classBody.push(`return ${name};`);
        classBody.push("})()");
    }
    return classBody.join("\n");
}
function generateFunctionComponent(functionInfo: FunctionInformation, memo: string | null): string {
    const funcBody: string[] = [];
    if (functionInfo.wrapped) {
        funcBody.push(`(() => {`);
    }

    const { name, props, staticProperties, renderBody, areEqualFunction } = functionInfo;

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

    for (const staticProp of staticProperties) {
        funcBody.push(`${name}.${staticProp}`);
    }

    if (functionInfo.wrapped) {
        funcBody.push(`return ${name};`);
        funcBody.push("})()");
    }
    return funcBody.join("\n");
}

export { generateClassComponent, generateFunctionComponent };
