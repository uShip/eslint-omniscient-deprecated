import prettier from "prettier";

export interface ComponentInformation {
    name: string;
    wrapped: boolean;
    staticProperties: string[];
    renderBody: string;
    shouldUpdateFunction: string | null;
}

export interface ClassInformation extends ComponentInformation {
    extendsName: string;
    constructorLines: string[];
    instanceProperties: string[];
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
        shouldUpdateFunction,
    } = classInfo;

    if (shouldUpdateFunction) {
        if (canUseClassProperties) {
            instanceProperties.unshift(`shouldComponentUpdate = ${shouldUpdateFunction};`);
        } else {
            const shouldUpdateBody: string[] = [];
            shouldUpdateBody.push(`shouldComponentUpdate(nextProps, nextState) {`);
            shouldUpdateBody.push(`return ${shouldUpdateFunction}(nextProps, nextState);`);
            shouldUpdateBody.push(`}`);
            instanceProperties.unshift(...shouldUpdateBody.reverse());
        }
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
function generateFunctionComponent(functionInfo: ComponentInformation): string {
    return "";
}

export { generateClassComponent, generateFunctionComponent };
