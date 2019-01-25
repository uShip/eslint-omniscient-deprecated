import { Rule, SourceCode } from "eslint";
import { Program, ImportDeclaration, CallExpression, Literal, Node as EsNode, Identifier, BaseFunction, ObjectExpression, FunctionExpression, Property, ReturnStatement } from "estree";
import prettier from 'prettier';

export class ComponentFixer {
    private _context: Rule.RuleContext;
    private componentModule: string;
    private componentImportName: string;
    private useClassProperties: boolean;

    constructor(context: Rule.RuleContext, componentModule: string, componentImportName: string, useClassProperties: boolean) {
        this._context = context;
        this.componentModule = componentModule;
        this.componentImportName = componentImportName;
        this.useClassProperties = useClassProperties;
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
            return false
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

    public processCallSite(calli: CallExpression) {

    }

    public getFixit(calli: CallExpression) {
        return (fixer: Rule.RuleFixer) => this.fix(calli, fixer);
    }

    public fix(calli: CallExpression, fixer: Rule.RuleFixer): Rule.Fix | Rule.Fix[] {
        const sourceCode = this._context.getSourceCode();

        const { displayName, className } = this.getComponentNames(calli);
        const imports = this.getBaseComponentFixitAndNames(fixer);
        const importName = imports.imported ? imports.imported : `${(imports.defaultImport || "React")}.Component`;
        const anonymousClass = className === "AnonymousComponent";

        let componentOptions: ObjectExpression | null = null;
        const componentOptionsArg = !displayName && calli.arguments.length === 2 ? 0 : (calli.arguments.length === 3 ? 1 : -1);
        if (componentOptionsArg >= 0) {
            if (calli.arguments[componentOptionsArg].type !== "ObjectExpression") {
                console.debug("Non-object expressions not support.");
                return [];
            }
            componentOptions = calli.arguments[componentOptionsArg] as ObjectExpression;
        }

        const constructorLines: string[] = [];
        const bodyProps = [];
        const staticProps: string[] = [];
        if (displayName) {
            staticProps.push(`displayName = ${this.smartQuote(displayName)};`);
        }
        
        let methods: Property[] = [];
        if (componentOptions) {
            for (const property of componentOptions.properties) {
                if (property.key.type === "Identifier" && property.key.name === "getInitialState") {
                    const body = property.value;
                    if (body.type !== "FunctionExpression" || body.body.type !== "BlockStatement") {
                        bodyProps.push(this.propertyBodyToSource(property, 'getInitialState', sourceCode));
                        constructorLines.push(`this.state = getInitialState();`);
                    } else {
                        const stateBody = sourceCode.getText(((body as FunctionExpression).body.body as [ReturnStatement])[0].argument!)
                        constructorLines.push(`this.state = ${stateBody};`);
                    }
                    continue;
                }

                const text = this.mapMixinToProperty(property);
                if (text) {
                    bodyProps.push(...text);
                }
            }
            methods = this.getMethods(componentOptions.properties);
        }

        const renderFunc = calli.arguments[calli.arguments.length === 3 ? 2 : 1] as FunctionExpression;
        const renderBody = this.createRenderBody(renderFunc, sourceCode, methods);
        bodyProps.unshift(`render() ${renderBody}`);

        const classBody: string[] = [];
        if (anonymousClass) {
            classBody.push(`(() => {`);
        }
        
        classBody.push(`class ${className} extends ${importName} {`);
        

        if (constructorLines.length > 0) {
            classBody.push('constructor(props) {');
            classBody.push('super(props);')
            for (const constructorLine of constructorLines) {
                classBody.push(constructorLine);
            }
            classBody.push('}');
            classBody.push('');
        }

        while (bodyProps.length > 0) {
            const next = bodyProps.pop()!;
            classBody.push(next);
            if (bodyProps.length > 0) {
                classBody.push('');
            }
        }

        classBody.push('}');
        classBody.push('');

        for (const staticProp of staticProps) {
            classBody.push(`${className}.${staticProp}`);
        }

        if (anonymousClass) {
            classBody.push(`return ${className};`)
            classBody.push('})()');
        }

        const fixits: Array<Rule.Fix> = [];

        if (imports.importFixer) {
            fixits.push(imports.importFixer);
        }
        fixits.push(this.formatAndReplace(calli, fixer, classBody.join('\n')));
        return fixits;
    }

    private getOmniscientImport() {
        const nodeVariables = this._context.getAncestors();
        const scriptContext = nodeVariables[0];
        const imports: ImportDeclaration[] = (scriptContext as Program).body.filter(node => node.type === "ImportDeclaration") as ImportDeclaration[];
        if (imports.length === 0) {
            return null;
        }

        return imports.find((node) => {
            return node.source.value === "omniscient";
        });
    }

    private getOmniscientImportName() {
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

    private getBaseComponentFixitAndNames(fixer: Rule.RuleFixer): { importFixer: Rule.Fix | null; defaultImport: string | null; imported: string | null } {
        const root = this._context.getAncestors()[0];
        if (root.type !== "Program") {
            return { importFixer: null, defaultImport: null, imported: null };
        }

        let baseImportDeclaration: ImportDeclaration | null = null;
        for (const child of root.body) {
            if (child.type !== "ImportDeclaration") {
                continue;
            }

            if (child.source.value !== this.componentModule) {
                continue;
            }
            baseImportDeclaration = child;
        }

        // TODO: Take into account scope conflict aka HOC which take a Component param
        if (!baseImportDeclaration) {
            const fix: Rule.Fix = { range: [0,0], text: `import { ${this.componentImportName} } from '${this.componentModule}';\n` };
            return { importFixer: fix, defaultImport: null, imported: this.componentImportName };
        }

        let defaultImport: string | null = null;
        let lastImportSpecifier: [number, number] | null = null;

        for (const specifier of baseImportDeclaration.specifiers) {
            if (specifier.type === "ImportDefaultSpecifier") {
                defaultImport = specifier.local.name;
            } else if (specifier.type === "ImportSpecifier") {
                if (specifier.imported.name === this.componentImportName) {
                    return { importFixer: null, defaultImport: null, imported: specifier.local.name };
                }
                lastImportSpecifier = specifier.range!;
            }
        }

        if (lastImportSpecifier) {
            return {
                importFixer: fixer.insertTextAfterRange(lastImportSpecifier, `, ${this.componentImportName}`),
                defaultImport: null,
                imported: this.componentImportName
            };
        } else if (defaultImport) {
            return { importFixer: null, defaultImport, imported: null };   
        }
        return { importFixer: null, defaultImport: null, imported: null };
    }

    
    private getComponentNames(componentCall: CallExpression) {
        const sourceCode = this._context.getSourceCode();

        // Does this component have a display name?
        if (componentCall.arguments[0].type === "ObjectExpression") {
            const parent = (componentCall as any)["parent"] as EsNode;
            const className = parent.type === "VariableDeclarator" ? (parent.id as Identifier).name : "AnonymousComponent";
            return {
                displayName: null,
                className
            };
        } else {
            const displayName = this.stripQuotes(sourceCode.getText(componentCall.arguments[0]));
            const parent = (componentCall as any)["parent"] as EsNode;
            const className = parent.type === "VariableDeclarator" ? (parent.id as Identifier).name : "AnonymousComponent";
            return {
                displayName,
                className
            };
        }
    }

    private propertyBodyToSource(property: Property, name: string, sourceCode: SourceCode) {            
        let body = '';
        if (property.shorthand) {
            body = `${name} = ${name};`;
        } else if (property.method) {
            if (this.useClassProperties) {
                let methodText = sourceCode.getText(property.value);
                methodText = methodText.replace(/\) \{/, ') => {');
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
        
        let name: string = '';
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
            name = `static ${name}`
        }

        if (name === "getDefaultProps") {
            const body = property.value;
            if (body.type !== "FunctionExpression" || body.body.type !== "BlockStatement") {
                return [
                    `static defaultProps = ${name}();`,
                    this.propertyBodyToSource(property, `static ${name}`, sourceCode)
                ]
            } else if (body.body.body[0].type !== "ReturnStatement") {
                return [`static get defaultProps${sourceCode.getText(body)}`];
            }
            return [`static defaultProps = ${sourceCode.getText((body.body.body as [ReturnStatement])[0].argument!)};`]
        }
        return [this.propertyBodyToSource(property, name, sourceCode)];
    }

    private getMethods(properties: Property[]) {
        const methods: Property[] = [];
        for(const prop of properties) {
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

    private createRenderBody(renderFunc: BaseFunction, sourceCode: SourceCode, methods: Property[]) {
        const hasPropsArgument = renderFunc.params.length > 0;

        const isExpression = renderFunc.body.type !== "BlockStatement";
        const renderBodySource = sourceCode.getText(renderFunc.body);

        let renderNewText = renderBodySource.split('\n').join('\n    ');
        if (!isExpression) {
            renderNewText = renderNewText.replace(/^\s*{\s*/g, "");
            renderNewText = renderNewText.replace(/\s*}\s*$/g, "");
        }

        let propsInit = '';
        if (hasPropsArgument) {
            const propsArg = renderFunc.params[0];
            if (propsArg.type === "Identifier") {
                propsInit = `const ${propsArg.name} = this.props;`;
            } else if (propsArg.type === "ObjectPattern") {
                propsInit = `const ${sourceCode.getText(propsArg)} = this.props;`
            }
            propsInit += '\n        ';
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
                name = `[${name}]`
            } else {
                name = `.${name}`
            }

            if (!this.useClassProperties) {
                const rawName = name;
    
                // Escape any special characters
                name = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

                renderNewText = renderNewText.replace(new RegExp("this" + name + "[}\w;\,]", "gm"), (substring) => {
                    return `this${rawName}.bind(this)${substring[substring.length - 1]}`
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

    private formatAndReplace(callExpression: CallExpression, fixer: Rule.RuleFixer, newBody: string) {
        let parent = callExpression as any;
        while (parent.parent && parent.parent.type !== "Program" && parent.parent.type !== "ReturnStatement") {
            parent = parent.parent;
        }

        const anonymousClass = parent.parent.type === "ReturnStatement";

        let formattedBody = prettier.format(newBody, {
            parser: 'babylon',
            tabWidth: 4
        }).trim();
        
        if (anonymousClass) {
            formattedBody = formattedBody.replace(/\;$/, '');
        }

        return fixer.replaceText(parent, formattedBody);
    }

    private stripQuotes(line: string) {
        if (line.startsWith(`'`) || line.startsWith(`"`) || line.startsWith('`')) {
            return line.replace(/^[\'\"\`]/gm, '').replace(/[\'\"\`]$/gm, '');
        }
        return line;
    }
    
    private smartQuote(text: string) {
        const quoteMarks = text.includes(`"`) 
            ? text.includes(`'`) 
                ? '`' 
                    : `'` 
            : '"';
        return `${quoteMarks}${text}${quoteMarks}`;

    }
}