import { Rule, SourceCode, Scope } from "eslint";
import {
    Program,
    ImportDeclaration,
    CallExpression,
    Node as EsNode,
    Identifier,
    BaseFunction,
    ObjectExpression,
    FunctionExpression,
    Property,
    ReturnStatement,
} from "estree";
import prettier from "prettier";
import { OmniscientComponentRuleOptions } from "../omniscient-component";
import { generateClassComponent, generateFunctionComponent } from "./generateComponent";

type ComponentFixerOptions = OmniscientComponentRuleOptions;

export class ComponentFixer {
    private _context: Rule.RuleContext;
    private _options: ComponentFixerOptions;

    public constructor(context: Rule.RuleContext, options: ComponentFixerOptions) {
        this._context = context;
        this._options = options;
    }

    public isError(calli: CallExpression): boolean {
        const componentImportName = this.getOmniscientImportName();
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

        // Is the last argument a render expression?
        if (!calli.arguments[calli.arguments.length - 1].type.includes("Expression")) {
            return false;
        }

        // If we're only a render function, we're good.
        if (calli.arguments.length === 1) {
            return true;
        }

        if (calli.arguments.length === 2) {
            switch (calli.arguments[0].type) {
                case "Literal":
                case "Identifier":
                case "BinaryExpression":
                    // This is a component display name;
                    return true;
                case "ObjectExpression":
                    // This is a component definition
                    return true;
                default:
                    return false;
            }
        }

        if (calli.arguments.length === 3) {
            switch (calli.arguments[1].type) {
                case "ObjectExpression":
                    // This is a component definition
                    return true;
                default:
                    return false;
            }
        }

        return false;
    }

    public getFixit(calli: CallExpression): (fixer: Rule.RuleFixer) => Rule.Fix | Rule.Fix[] {
        return (fixer: Rule.RuleFixer) => this.fix(calli, fixer);
    }

    public fix(calli: CallExpression, fixer: Rule.RuleFixer): Rule.Fix | Rule.Fix[] {
        const sourceCode = this._context.getSourceCode();
        const { displayName, className } = this.getComponentNames(calli);

        // Deteremine whether this component has any mixins
        let componentMixins: ObjectExpression | null = null;
        const componentOptionsArg =
            !displayName && calli.arguments.length === 2 ? 0 : calli.arguments.length === 3 ? 1 : -1;
        if (componentOptionsArg >= 0) {
            if (calli.arguments[componentOptionsArg].type !== "ObjectExpression") {
                console.debug("Non-object expressions not support.");
                return [];
            }
            componentMixins = calli.arguments[componentOptionsArg] as ObjectExpression;
        }

        // Get component base information
        const isLikelyMemoizable = this.isLikelyMemoizable(calli);
        const imports = this.getBaseComponentFixitAndNames(fixer, isLikelyMemoizable, componentMixins == null);
        if (imports == null) {
            throw Error("Unable to process imports for file");
        }
        const { componentInfo, areEqualInfo, canUseAreEqual, classForm } = imports;
        const componentImportName = componentInfo.importModule
            ? `${componentInfo.importModule}.${componentInfo.importName}`
            : componentInfo.importName;
        const anonymousClass = className === "AnonymousComponent";

        // Begin building the actual render body
        const constructorLines: string[] = [];
        const bodyProps = [];
        const staticProps: string[] = [];
        if (displayName) {
            staticProps.push(`displayName = ${displayName};`);
        }

        let methods: Property[] = [];
        if (componentMixins) {
            for (const property of componentMixins.properties) {
                if (property.key.type === "Identifier" && property.key.name === "getInitialState") {
                    const body = property.value;
                    if (body.type !== "FunctionExpression" || body.body.type !== "BlockStatement") {
                        bodyProps.push(this.propertyBodyToSource(property, "getInitialState", sourceCode));
                        constructorLines.push(`this.state = getInitialState();`);
                    } else {
                        const stateBody = sourceCode.getText(
                            ((body as FunctionExpression).body.body as [ReturnStatement])[0].argument!
                        );
                        constructorLines.push(`this.state = ${stateBody};`);
                    }
                    continue;
                }

                const text = this.mapMixinToProperty(property);
                if (text) {
                    bodyProps.push(...text);
                }
            }
            methods = this.getMethods(componentMixins.properties);
        }

        const renderFunc = calli.arguments[calli.arguments.length - 1] as FunctionExpression;
        const renderBody = this.createRenderBody(renderFunc, sourceCode, methods);

        let body: string;
        if (classForm) {
            body = generateClassComponent(
                {
                    name: className,
                    extendsName: componentImportName,
                    constructorLines,
                    wrapped: anonymousClass,
                    instanceProperties: bodyProps,
                    staticProperties: staticProps,
                    renderBody,
                    areEqualFunction: canUseAreEqual ? areEqualInfo!.importName : null,
                },
                this._options.useClassProperties
            );
        } else {
            body = generateFunctionComponent(
                {
                    name: className,
                    wrapped: anonymousClass,
                    staticProperties: staticProps,
                    renderBody,
                    areEqualFunction:
                        canUseAreEqual && this._options.passAreEqualToMemo ? areEqualInfo!.importName : null,
                    props: "", // TODO
                },
                this._options.memoImport
            );
        }

        const fixits: Rule.Fix[] = [];

        if (componentInfo.fixit) {
            fixits.push(componentInfo.fixit);
        }
        if (areEqualInfo && areEqualInfo.fixit) {
            fixits.push(areEqualInfo.fixit);
        }
        fixits.push(this.formatAndReplace(calli, fixer, body));
        return fixits;
    }

    private getOmniscientImport(): ImportDeclaration | undefined | null {
        let topLevel: Scope.Scope = this._context.getScope();
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

    public getOmniscientImportName(): string | null {
        const omniscient = this.getOmniscientImport();

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
        componentInfo: ImportInformation;
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
        } else if (isLikelyMemoizable) {
            const usePure = this._options.pureComponentImport != null && this._options.pureComponentImport != null;
            importName = usePure ? this._options.pureComponentImport! : this._options.componentImport;
            importModule = usePure ? this._options.pureComponentModule! : this._options.componentModule;
            canUseAreEqual = !usePure;
        } else {
            importName = this._options.componentImport;
            importModule = this._options.componentModule;
        }

        const componentInfo = this.getImportAndFixit(fixer, root, importName, importModule);
        if (componentInfo == null) {
            return null;
        }

        let areEqualInfo: ReturnType<ComponentFixer["getImportAndFixit"]> | null = null;
        if (canUseAreEqual) {
            areEqualInfo = this.getImportAndFixit(
                fixer,
                root,
                this._options.areEqualImport,
                this._options.areEqualModule
            );
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

        const { variables } = this._context.getScope();

        // Ensure that the import name does conflict with any other variable names.
        let i = 0;
        const baseName = importName;
        let mapped = false;
        function isNonImportMatch(variable: Scope.Variable): boolean {
            if (variable.name !== importName) {
                return false;
            }

            return !variable.defs.every(
                scope => scope.type === "ImportBinding" && scope.parent.source.value === importModule
            );
        }

        while (variables.find(isNonImportMatch)) {
            importName = `${baseName}${i++}`;
            mapped = true;
        }

        const importSpecifier = `${mapped ? `${baseName} as ${importName}` : importName}`;

        if (!baseImportDeclaration) {
            const fix: Rule.Fix = {
                range: [0, 0],
                text: `import { ${importSpecifier} } from '${importModule}';\n`,
            };
            return { fixit: fix, importName };
        }

        let defaultImport: string | null = null;
        let lastImportSpecifier: [number, number] | null = null;

        for (const specifier of baseImportDeclaration.specifiers) {
            if (specifier.type === "ImportDefaultSpecifier") {
                defaultImport = specifier.local.name;
            } else if (specifier.type === "ImportSpecifier") {
                if (specifier.imported.name === importName) {
                    return { importName: specifier.local.name };
                }
                lastImportSpecifier = specifier.range!;
            }
        }

        if (lastImportSpecifier) {
            return {
                fixit: fixer.insertTextAfterRange(lastImportSpecifier, `, ${importSpecifier}`),
                importName,
            };
        } else if (defaultImport) {
            return { importModule: defaultImport, importName };
        }
        return null;
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

    private propertyBodyToSource(property: Property, name: string, sourceCode: SourceCode): string {
        let body = "";
        if (property.shorthand) {
            body = `${name} = ${name};`;
        } else if (property.method) {
            if (this._options.useClassProperties) {
                let methodText = sourceCode.getText(property.value);
                methodText = methodText.replace(/\) \{/, ") => {");
                body = `${name} = ${methodText}`;
            } else {
                body = sourceCode.getText(property);
            }
        } else {
            // TODO: Special case functions
            body = `${name} = ${sourceCode.getText(property.value)};`;
        }
        return body;
    }

    private mapMixinToProperty(property: Property): string[] {
        const sourceCode = this._context.getSourceCode();

        let name = "";
        const key = property.key;
        switch (key.type) {
            case "Literal":
                name = `${key.value}`;
                break;
            case "Identifier":
                name = key.name;
                break;
            default:
                name = sourceCode.getText(key);
        }

        if (property.computed) {
            name = `[${name}]`;
        }

        if (name === "propTypes") {
            name = `static ${name}`;
        }

        if (name === "getDefaultProps") {
            const body = property.value;
            if (body.type !== "FunctionExpression" || body.body.type !== "BlockStatement") {
                return [
                    `static defaultProps = ${name}();`,
                    this.propertyBodyToSource(property, `static ${name}`, sourceCode),
                ];
            } else if (body.body.body[0].type !== "ReturnStatement") {
                return [`static get defaultProps${sourceCode.getText(body)}`];
            }
            return [`static defaultProps = ${sourceCode.getText((body.body.body as [ReturnStatement])[0].argument!)};`];
        }
        return [this.propertyBodyToSource(property, name, sourceCode)];
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

    private createRenderBody(renderFunc: BaseFunction, sourceCode: SourceCode, methods: Property[]): string {
        const hasPropsArgument = renderFunc.params.length > 0;

        const isExpression = renderFunc.body.type !== "BlockStatement";
        const renderBodySource = sourceCode.getText(renderFunc.body);

        let renderNewText = renderBodySource.split("\n").join("\n    ");
        if (!isExpression) {
            renderNewText = renderNewText.replace(/^\s*{\s*/g, "");
            renderNewText = renderNewText.replace(/\s*}\s*$/g, "");
        }

        let propsInit = "";
        if (hasPropsArgument) {
            const propsArg = renderFunc.params[0];
            if (propsArg.type === "Identifier") {
                propsInit = `const ${propsArg.name} = this.props;`;
            } else if (propsArg.type === "ObjectPattern") {
                propsInit = `const ${sourceCode.getText(propsArg)} = this.props;`;
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
    private isLikelyMemoizable(calli: CallExpression): boolean {
        const sourceCode = this._context.getSourceCode();
        return !sourceCode.getText(calli).includes("this.state");
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

    private smartQuote(text: string): string {
        const quoteMarks = text.includes(`"`) ? (text.includes(`'`) ? "`" : `'`) : '"';
        return `${quoteMarks}${text}${quoteMarks}`;
    }
}

interface ImportInformation {
    importName: string;
    importModule?: string;
    fixit?: Rule.Fix;
}
