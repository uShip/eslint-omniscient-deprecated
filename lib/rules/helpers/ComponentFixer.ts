import { Rule, SourceCode, Scope } from "eslint";
import {
    Program,
    ImportDeclaration,
    CallExpression,
    Node as EsNode,
    Identifier,
    Function as EsFunction,
    ObjectExpression,
    FunctionExpression,
    Property,
    ObjectPattern,
} from "estree";
import prettier from "prettier";
import { OmniscientComponentRuleOptions } from "../omniscient-component";
import {
    generateClassComponent,
    generateFunctionComponent,
    ComponentProperty,
    ComponentValueProperty,
    ComponentMethodProperty,
} from "./generateComponent";

type ComponentFixerOptions = OmniscientComponentRuleOptions;

export class ComponentFixer {
    private _context: Rule.RuleContext;
    private _options: ComponentFixerOptions;
    private _calli: CallExpression;

    public constructor(context: Rule.RuleContext, options: ComponentFixerOptions, calli: CallExpression) {
        this._context = context;
        this._options = options;
        this._calli = calli;
    }

    public usesChildrenInBody = false;
    public unknownPropsAccess = false;

    public get componentCall(): CallExpression {
        return this._calli;
    }

    public get renderFunction(): FunctionExpression {
        return this.componentCall.arguments[this.componentCall.arguments.length - 1] as FunctionExpression;
    }

    public isError(calli: CallExpression): boolean {
        const componentImportName = ComponentFixer.getOmniscientImportName(this._context);
        if (!componentImportName) {
            return false;
        }

        if (calli.callee.type !== "Identifier" || calli.callee.name !== componentImportName) {
            return false;
        }
        return true;
    }

    public canFix(calli: CallExpression): boolean {
        const parent = (calli as any)["parent"] as EsNode;
        if (parent.type !== "VariableDeclarator" && parent.type !== "ReturnStatement") {
            return false;
        }

        // Probably just typing out the component?
        if (calli.arguments.length === 0) {
            return false;
        }

        // Is the last argument a valid render Function?
        const renderFunc = calli.arguments[calli.arguments.length - 1];
        if (!renderFunc.type.includes("Expression")) {
            return false;
        }

        try {
            ComponentFixer.getRenderProps(renderFunc as FunctionExpression);
        } catch (e) {
            return false;
        }

        if (calli.arguments.length === 2) {
            // Check if name or options
            switch (calli.arguments[0].type) {
                case "Literal":
                case "TemplateLiteral":
                case "Identifier":
                case "BinaryExpression":
                    // This is the component's displayName
                    break;
                case "ObjectExpression":
                    // This is the component's mixins
                    break;
                default:
                    return false;
            }
        } else if (calli.arguments.length === 3) {
            // Check the displayName argument
            switch (calli.arguments[0].type) {
                case "Literal":
                case "TemplateLiteral":
                case "Identifier":
                case "BinaryExpression":
                    // This is the component's displayName
                    break;
                default:
                    return false;
            }
            // Check the mixin argument
            switch (calli.arguments[1].type) {
                case "ObjectExpression":
                    // This is the component's mixins
                    break;
                default:
                    return false;
            }
        }

        return true;
    }

    public getFixit(calli: CallExpression): (fixer: Rule.RuleFixer) => Rule.Fix[] {
        return (fixer: Rule.RuleFixer) => this.fix(calli, fixer);
    }

    public fix(calli: CallExpression, fixer: Rule.RuleFixer): Rule.Fix[] {
        const sourceCode = this._context.getSourceCode();
        const { displayName, className } = this.getComponentNames(calli);

        // Deteremine whether this component has any mixins
        let componentMixins: ObjectExpression | null = null;
        const componentOptionsArg =
            !displayName && calli.arguments.length === 2 ? 0 : calli.arguments.length === 3 ? 1 : -1;
        if (componentOptionsArg >= 0) {
            if (calli.arguments[componentOptionsArg].type !== "ObjectExpression") {
                throw Error("Recieved non-ObjectExpression in options position.");
            }
            componentMixins = calli.arguments[componentOptionsArg] as ObjectExpression;
        }

        // Get component base information
        const isLikelyMemoizable = this.isLikelyMemoizable(calli, sourceCode);
        const isLikelyFunctional = this.isLikelyFunctional(calli, sourceCode, componentMixins);
        const imports = this.getBaseComponentFixitAndNames(fixer, isLikelyMemoizable, isLikelyFunctional);
        if (imports == null) {
            throw Error("Unable to process imports for file.");
        }
        const { componentInfo, areEqualInfo, canUseAreEqual, classForm } = imports;
        const anonymousClass = className === "AnonymousComponent";

        // Begin building the actual render body
        const properties: ComponentProperty[] = [];
        if (displayName) {
            properties.push({
                type: "Value",
                isStatic: true,
                key: { text: "displayName" },
                rawText: displayName,
            });
        }

        let methods: Property[] = [];
        if (componentMixins) {
            for (const property of componentMixins.properties) {
                const mixinProps = this.mapMixinToProperty(property);
                properties.push(...mixinProps);
            }
            methods = this.getMethods(componentMixins.properties);
        }

        const renderFunc = calli.arguments[calli.arguments.length - 1] as FunctionExpression;
        const renderBody = this.createRenderBody(renderFunc, sourceCode, methods, classForm);

        let body: string;
        if (classForm) {
            const componentImportName = componentInfo!.importModule
                ? `${componentInfo!.importModule}.${componentInfo!.importName}`
                : componentInfo!.importName;
            body = generateClassComponent(
                {
                    sourceCode,
                    isUnmemoizable: !isLikelyMemoizable,
                    canUseClassProperties: this._options.useClassProperties,
                },
                {
                    name: className,
                    wrapped: anonymousClass,
                    properties,
                    extendsName: componentImportName,
                    renderBody,
                    areEqualFunction: canUseAreEqual && isLikelyMemoizable ? areEqualInfo!.importName : null,
                }
            );
        } else {
            const props = renderFunc.params.length > 0 ? sourceCode.getText(renderFunc.params[0]) : "";
            const areEqualName =
                canUseAreEqual && areEqualInfo != null
                    ? `${areEqualInfo!.importModule ? `${areEqualInfo!.importModule}.` : ""}${areEqualInfo!.importName}`
                    : null;

            const memoImportName =
                componentInfo != null
                    ? componentInfo!.importModule
                        ? `${componentInfo!.importModule}.${componentInfo!.importName}`
                        : componentInfo!.importName
                    : null;
            body = generateFunctionComponent(
                { sourceCode, isUnmemoizable: !isLikelyMemoizable },
                {
                    name: className,
                    wrapped: anonymousClass,
                    properties,
                    renderBody,
                    areEqualFunction: areEqualName ? areEqualName : null,
                    props,
                },
                memoImportName
            );
        }

        const fixits: Rule.Fix[] = [];

        if (componentInfo && componentInfo.fixit) {
            fixits.push(componentInfo.fixit);
        }
        if (areEqualInfo && areEqualInfo.fixit) {
            fixits.push(areEqualInfo.fixit);
        }
        fixits.push(this.formatAndReplace(calli, fixer, body));
        return fixits;
    }

    private static getOmniscientImport(context: Rule.RuleContext): ImportDeclaration | undefined | null {
        let topLevel: Scope.Scope = context.getScope();
        while (topLevel.upper) {
            topLevel = topLevel.upper;
        }
        const scriptContext = topLevel.block;
        const imports: ImportDeclaration[] = (scriptContext as Program).body.filter(
            node => node.type === "ImportDeclaration"
        ) as ImportDeclaration[];
        if (imports.length === 0) {
            return null;
        }

        return imports.find(node => {
            return node.source.value === "omniscient";
        });
    }

    public static getOmniscientImportName(context: Rule.RuleContext): string | null {
        const omniscient = ComponentFixer.getOmniscientImport(context);

        if (!omniscient) {
            return null;
        }

        const defaultIdentifier = omniscient.specifiers.find(node => node.type === "ImportDefaultSpecifier");
        if (defaultIdentifier) {
            return defaultIdentifier.local.name;
        }

        // TODO: Support other ways of importing?
        return null;
    }
    private getBaseComponentFixitAndNames(
        fixer: Rule.RuleFixer,
        isLikelyMemoizable: boolean,
        isFunctional: boolean
    ): {
        componentInfo: ImportInformation | null;
        areEqualInfo: ImportInformation | null;
        classForm: boolean;
        canUseAreEqual: boolean;
    } | null {
        const root = this._context.getAncestors()[0];
        let classForm = true;
        let canUseAreEqual = true;
        if (root.type !== "Program") {
            return null;
        }

        let importName: string;
        let importModule: string;
        if (isLikelyMemoizable && isFunctional && this._options.memoImport && this._options.memoModule) {
            importName = this._options.memoImport;
            importModule = this._options.memoModule;
            classForm = false;
            canUseAreEqual = this._options.passAreEqualToMemo;
        } else if (isLikelyMemoizable) {
            const usePure = this._options.pureComponentImport != null && this._options.pureComponentImport != null;
            importName = usePure ? this._options.pureComponentImport! : this._options.componentImport;
            importModule = usePure ? this._options.pureComponentModule! : this._options.componentModule;
            canUseAreEqual = !usePure;
        } else if (!isFunctional) {
            importName = this._options.componentImport;
            importModule = this._options.componentModule;
        } else {
            return {
                classForm: false,
                areEqualInfo: null,
                componentInfo: null,
                canUseAreEqual: false,
            };
        }

        const componentInfo = this.getImportAndFixit(fixer, root, importName, importModule);
        if (componentInfo == null) {
            return null;
        }

        let areEqualInfo: ReturnType<ComponentFixer["getImportAndFixit"]> | null = null;
        if (canUseAreEqual && isLikelyMemoizable) {
            // Double check we didn't just create an import we can piggy back off of.
            const alreadyExistingImport =
                componentInfo.importModule && componentInfo.importModule === this._options.areEqualModule;
            const alreadyNewImport =
                componentInfo.inferedModule &&
                componentInfo.inferedSpecifier &&
                componentInfo.inferedModule === this._options.areEqualModule;
            if (componentInfo.fixit && (alreadyExistingImport || alreadyNewImport)) {
                // Grab a safe name for our areEqual import
                let areEqualImportName = this._options.areEqualImport;
                const baseName = areEqualImportName;
                const safeName = this.getSafeImportAlias(baseName, this._options.areEqualModule);
                let mapped = safeName[0];
                if (mapped) {
                    areEqualImportName = safeName[1];
                }

                const importSpecifier = `${mapped ? `${baseName} as ${areEqualImportName}` : areEqualImportName}`;

                // If there's a new import we just created, just map ours on.
                if (alreadyNewImport) {
                    componentInfo.fixit = {
                        range: [0, 0],
                        text: `import { ${componentInfo.inferedSpecifier}, ${importSpecifier} } from '${
                            componentInfo.inferedModule
                        }';\n`,
                    };
                    areEqualInfo = {
                        importName: areEqualImportName,
                    };
                } else if (componentInfo.inferedIsDefault) {
                    areEqualInfo = { importModule: componentInfo.importModule!, importName: componentInfo.importName! };
                } else {
                    const imports = `, ${componentInfo.inferedSpecifier}, ${importSpecifier}`;
                    componentInfo.fixit = fixer.insertTextAfterRange(componentInfo.lastImportSpecifier!, imports);
                    areEqualInfo = {
                        importName: areEqualImportName,
                    };
                }
            } else {
                areEqualInfo = this.getImportAndFixit(
                    fixer,
                    root,
                    this._options.areEqualImport,
                    this._options.areEqualModule
                );
            }
        }
        return {
            componentInfo,
            areEqualInfo,
            classForm,
            canUseAreEqual,
        };
    }

    private getImportAndFixit(
        fixer: Rule.RuleFixer,
        root: Program,
        importName: string,
        importModule: string
    ): ImportInformation | null {
        let baseImportDeclaration: ImportDeclaration | null = null;
        for (const child of root.body) {
            if (child.type !== "ImportDeclaration") {
                continue;
            }

            if (child.source.value !== importModule) {
                continue;
            }
            baseImportDeclaration = child;
        }

        // Ensure that the import name does conflict with any other variable names.
        const baseName = importName;
        const safeName = this.getSafeImportAlias(baseName, importModule);
        let mapped = safeName[0];
        if (mapped) {
            importName = safeName[1];
        }

        const importSpecifier = `${mapped ? `${baseName} as ${importName}` : importName}`;

        if (!baseImportDeclaration) {
            const fix: Rule.Fix = {
                range: [0, 0],
                text: `import { ${importSpecifier} } from '${importModule}';\n`,
            };
            return { fixit: fix, importName, inferedSpecifier: importSpecifier, inferedModule: importModule };
        }

        let defaultImport: string | null = null;
        let lastImportSpecifier: [number, number] | null = null;

        for (const specifier of baseImportDeclaration.specifiers) {
            if (specifier.type === "ImportDefaultSpecifier") {
                defaultImport = specifier.local.name;
            } else if (specifier.type === "ImportSpecifier") {
                if (specifier.imported.name === baseName) {
                    return { importName: specifier.local.name };
                }
                lastImportSpecifier = specifier.range!;
            }
        }

        if (lastImportSpecifier) {
            return {
                fixit: fixer.insertTextAfterRange(lastImportSpecifier, `, ${importSpecifier}`),
                importName,
                inferedSpecifier: importSpecifier,
                lastImportSpecifier,
            };
        } else if (defaultImport) {
            return { importModule: defaultImport, importName: baseName, inferedIsDefault: true };
        }
        return null;
    }

    private getSafeImportAlias(name: string, importModule: string): [boolean, string] {
        const { variables } = this._context.getScope();

        // Ensure that the import name does conflict with any other variable names.
        let i = 0;
        const baseName = name;
        let mapped = false;
        function isNonImportMatch(variable: Scope.Variable): boolean {
            if (variable.name !== name) {
                return false;
            }

            return !variable.defs.every(
                scope => scope.type === "ImportBinding" && scope.parent.source.value === importModule
            );
        }

        while (variables.find(isNonImportMatch)) {
            name = `${baseName}${i++}`;
            mapped = true;
        }
        return [mapped, name];
    }

    private getComponentNames(componentCall: CallExpression): { displayName: string | null; className: string } {
        const sourceCode = this._context.getSourceCode();

        // Is this a render only component, or does this component have a display name?
        if (
            componentCall.arguments.length === 1 ||
            componentCall.arguments[0].type === "ObjectExpression" ||
            componentCall.arguments[0].type === "ArrayExpression"
        ) {
            const parent = (componentCall as any)["parent"] as EsNode;
            const className =
                parent.type === "VariableDeclarator" ? (parent.id as Identifier).name : "AnonymousComponent";
            return {
                displayName: null,
                className,
            };
        } else {
            // We have a display name
            const displayName = sourceCode.getText(componentCall.arguments[0]);
            const parent = (componentCall as any)["parent"] as EsNode;
            const className =
                parent.type === "VariableDeclarator" ? (parent.id as Identifier).name : "AnonymousComponent";
            return {
                displayName,
                className,
            };
        }
    }

    private mapMixinToProperty(property: Property): (ComponentMethodProperty | ComponentValueProperty)[] {
        const sourceCode = this._context.getSourceCode();

        let name = "";
        const rawName = (name = ComponentFixer.getPropName(property, sourceCode));

        if (ComponentFixer.mixinToStatic.has(name)) {
            name = ComponentFixer.mixinToStatic.get(name)!;
        }

        let isStatic = false;
        let isComputedIdentifier =
            property.computed && (property.key.type !== "Literal" || typeof property.key.value === "string");
        if (isComputedIdentifier) {
            name = `[${name}]`;
        }

        if (ComponentFixer.validFuncStatics.includes(name)) {
            isStatic = true;
        }

        // Special case the getInitialState conversion
        if (rawName === "getInitialState" || rawName === "getDefaultProps") {
            const reduced = this.reduceProperty(property);
            if (reduced) {
                return [
                    {
                        type: "Value",
                        isStatic,
                        rawText: reduced,
                        key: { text: name },
                        leadingComments: this.mapLeadingComments(property, sourceCode),
                        trailingComments: this.mapTrailingComments(property, sourceCode),
                    },
                ];
            }
            let rawText = `(${sourceCode.getText(property.value).replace(/\) \{/, ") => {")})`;
            if (property.value.type.includes("Function")) {
                rawText += "()";
            }
            return [
                {
                    type: "Value",
                    isStatic,
                    rawText,
                    key: { text: name },
                    leadingComments: this.mapLeadingComments(property, sourceCode),
                    trailingComments: this.mapTrailingComments(property, sourceCode),
                },
            ];
        }

        return [
            {
                key: {
                    text: name,
                    isComputedIdentifier,
                },
                isStatic,
                body: property.value as any,
                type: (property.value.type === "FunctionExpression" ? "Function" : "Value") as any,
                leadingComments: this.mapLeadingComments(property, sourceCode),
                trailingComments: this.mapTrailingComments(property, sourceCode),
            },
        ];
    }

    private reduceProperty(property: Property): string | undefined {
        if (!property.value.type.includes("Function")) return;
        const func = property.value as EsFunction;
        if (func.body.type !== "BlockStatement") return;
        const block = func.body;
        if (block.body.length !== 1) return;
        const statement = block.body[0];
        if (statement.type !== "ReturnStatement") return;
        if (statement.argument == null || statement.argument.type !== "ObjectExpression") return;
        return this._context.getSourceCode().getText(statement.argument);
    }

    private mapLeadingComments(property: Property, sourceCode: SourceCode): string[] {
        if (property.leadingComments == null || property.leadingComments.length === 0) {
            return [];
        }
        return property.leadingComments.map(comment => {
            return sourceCode.getText(comment as any);
        });
    }

    private mapTrailingComments(property: Property, sourceCode: SourceCode): string[] {
        if (property.trailingComments == null || property.trailingComments.length === 0) {
            return [];
        }
        return property.trailingComments.map(comment => {
            return sourceCode.getText(comment as any);
        });
    }

    private getMethods(properties: Property[]): Property[] {
        const methods: Property[] = [];
        for (const prop of properties) {
            if (prop.method) {
                methods.push(prop);
                continue;
            }

            if (prop.type.includes("FunctionExpression")) {
                methods.push(prop);
            }
        }
        return methods;
    }

    private createRenderBody(
        renderFunc: EsFunction,
        sourceCode: SourceCode,
        methods: Property[],
        isClassForm: boolean
    ): string {
        const hasPropsArgument = renderFunc.params.length > 0;

        const isExpression = renderFunc.body.type !== "BlockStatement";
        const renderBodySource = sourceCode.getText(renderFunc.body);

        let renderNewText = renderBodySource.split("\n").join("\n    ");
        if (!isExpression) {
            renderNewText = renderNewText.replace(/^\s*{\s*/g, "");
            renderNewText = renderNewText.replace(/\s*}\s*$/g, "");
        }

        let propsInit = "";
        const reassignsProps = /\s?props\s*=\s*/g.test(renderBodySource);
        const varKind = reassignsProps ? "let" : "const";
        if (hasPropsArgument && isClassForm) {
            const propsArg = renderFunc.params[0];
            if (propsArg.type === "Identifier") {
                propsInit = `${varKind} ${propsArg.name} = this.props;`;
            } else if (propsArg.type === "ObjectPattern") {
                propsInit = `${varKind} ${sourceCode.getText(propsArg)} = this.props;`;
            }
            propsInit += "\n        ";
        }

        for (const method of methods) {
            let name: string;
            if (method.key.type === "Identifier") {
                name = method.key.name;
            } else if (method.key.type === "Literal") {
                name = method.key.raw!;
            } else {
                name = sourceCode.getText(method.key);
            }

            if (method.key.type === "Literal" || method.computed) {
                name = `[${name}]`;
            } else {
                name = `.${name}`;
            }

            if (!this._options.useClassProperties) {
                const rawName = name;

                // Escape any special characters
                name = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

                renderNewText = renderNewText.replace(new RegExp("this" + name + "[}w;,]", "gm"), substring => {
                    return `this${rawName}.bind(this)${substring[substring.length - 1]}`;
                });
            }
        }

        if (isExpression) {
            renderNewText = `return ${renderNewText}`;
        }

        return `
{
    ${propsInit}${renderNewText}
}`.trim();
    }

    /**
     * Attempts to make a guess as to wether or not a component declaration is stateless.
     * @param calli The source call expression
     */
    private isLikelyMemoizable(calli: CallExpression, sourceCode: SourceCode): boolean {
        const renderFunc = calli.arguments[calli.arguments.length - 1] as FunctionExpression;
        const renderProps = ComponentFixer.getRenderProps(renderFunc);

        // Check if we use the children prop. If we do, it's pointless to memoize by default.
        if (renderProps.hasProps) {
            if (this.usesChildrenInBody) {
                return false;
            }
            if (renderProps.isObjectPattern) {
                const isChildrenProp = (prop: Property): boolean =>
                    prop.key /* Some parsers don't provide keys for spread properies */ &&
                    prop.key.type === "Identifier" &&
                    prop.key.name === "children";
                if (renderProps.props.properties.some(isChildrenProp)) return false;
            }
        }

        const source = sourceCode.getText(calli);
        if (source.includes("this.state") || source.includes("this.setState")) {
            return false;
        }

        // We should maybe eventually do a more interesting hurestic for complex state or props.
        return true;
    }

    private static getPropName(prop: Property, sourceCode: SourceCode): string {
        const key = prop.key;
        if (!key) {
            if ("argument" in prop && "name" in prop["argument"]) {
                return prop["argument"]["name"] as string;
            }
        }
        switch (key.type) {
            case "Literal":
                return `${key.value}`;
            case "Identifier":
                return key.name;
            default:
                return sourceCode.getText(key);
        }
    }

    private static mixinToStatic = new Map([["getDefaultProps", "defaultProps"], ["getInitialState", "state"]]);

    private static mapToStatic(mixinPropName: string): string | null {
        for (const set in this.mixinToStatic) {
            if (set[0] === mixinPropName) {
                return set[1];
            }
        }
        return null;
    }

    private static validFuncStatics = ["contextTypes", "propTypes", "defaultProps", "displayName"];

    private isLikelyFunctional(calli: CallExpression, sourceCode: SourceCode, mixin: ObjectExpression | null): boolean {
        // If we use state, this can't be reduced to a simple function.
        if (mixin) {
            const mixinProps = mixin.properties;

            // Check if the mixin has unsupported static props.
            for (const prop of mixinProps) {
                const name = ComponentFixer.getPropName(prop, sourceCode);
                const mappedName = ComponentFixer.mapToStatic(name) || name;
                if (!ComponentFixer.validFuncStatics.includes(mappedName)) {
                    return false;
                }
            }
        }
        const source = sourceCode.getText(calli);
        return !(source.includes("this.state") || source.includes("this.setState"));
    }

    public static getRenderProps(renderFunc: FunctionExpression): EmptyProps | NamedProps | DestructedProps {
        const propsArgument = renderFunc.params.length > 0 ? renderFunc.params[0] : null;
        if (propsArgument == null) {
            return { hasProps: false };
        }
        switch (propsArgument.type) {
            case "Identifier":
                return { hasProps: true, isObjectPattern: false, isRestPattern: false, props: propsArgument.name };
            case "ObjectPattern":
                return { hasProps: true, isObjectPattern: true, isRestPattern: false, props: propsArgument };
            default:
                throw Error("Unknown argument pattern for render props");
        }
    }

    private formatAndReplace(callExpression: CallExpression, fixer: Rule.RuleFixer, newBody: string): Rule.Fix {
        let parent = callExpression as any;
        while (parent.parent && parent.parent.type !== "Program" && parent.parent.type !== "ReturnStatement") {
            parent = parent.parent;
        }

        const anonymousClass = parent.parent.type === "ReturnStatement";

        let formattedBody = prettier
            .format(newBody, {
                parser: "babel" as "babylon",
                tabWidth: 4,
            })
            .trim();

        if (anonymousClass) {
            formattedBody = formattedBody.replace(/\;$/, "");
        }

        return fixer.replaceText(parent, formattedBody);
    }
}

interface ImportInformation {
    importName: string;
    importModule?: string;
    fixit?: Rule.Fix;

    // Special properties to allow modifying import info
    inferedModule?: string;
    inferedSpecifier?: string;
    inferedIsDefault?: boolean;
    lastImportSpecifier?: [number, number];
}

interface Props {
    hasProps: boolean;
}

interface EmptyProps extends Props {
    hasProps: false;
}

interface PresentProps extends Props {
    hasProps: true;
    isObjectPattern: boolean;
    isRestPattern: boolean;
}

interface NamedProps extends PresentProps {
    hasProps: true;
    isObjectPattern: false;
    isRestPattern: false;
    props: string;
}

interface DestructedProps extends PresentProps {
    hasProps: true;
    isObjectPattern: true;
    isRestPattern: false;
    props: ObjectPattern;
}
