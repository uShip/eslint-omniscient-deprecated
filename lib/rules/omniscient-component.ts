import { Rule, SourceCode } from "eslint";
import { Program, ImportDeclaration, CallExpression, Literal, Node as EsNode, Identifier, BaseFunction, ObjectExpression, FunctionExpression, Property, ReturnStatement } from "estree";
import prettier from 'prettier';

/**
 * @fileoverview Usage of omniscient component
 * @author Richard Simpson
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

enum ComponentCallForm {
    Unknown,
    Function,
    Component
}

const omniscientComponentRule: Rule.RuleModule = {
    meta: {
        docs: {
            description: "Usage of omniscient component",
            category: "uship.omniscient",
            recommended: true,
        },
        fixable: "code",
        messages: {
            "omniscient.usage-deprecated": "Usage of omniscient components is deprecated. You should use an immutable compatible component instead.",
        }
    },

    create(context) {

        // variables should be defined here

        //----------------------------------------------------------------------
        // Helpers
        //----------------------------------------------------------------------
        function getOmniscientImport() {
            const nodeVariables = context.getAncestors();
            const scriptContext = nodeVariables[0];
            const imports = (scriptContext as Program).body.filter(node => node.type === "ImportDeclaration") as ImportDeclaration[];
            if (imports.length === 0) {
                return null;
            }

            return imports.find((node) => {
                return node.source.value === "omniscient";
            });
        }

        function getComponentExportName() {
            const omniscient = getOmniscientImport();
            
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

        function getComponentCallForm(node: CallExpression) {
            switch (node.arguments.length) {
                case 2:
                    return ComponentCallForm.Function;
                case 3:
                    return ComponentCallForm.Component;
                default:
                    return ComponentCallForm.Unknown;
            }
        }

        function getComponentNames(componentCall: CallExpression) {
            const displayName = (componentCall.arguments[0] as Literal).value;
            const parent = (componentCall as any)["parent"] as EsNode;
            const className = parent.type === "VariableDeclarator" ? (parent.id as Identifier).name : displayName;
            return {
                displayName,
                className
            };
        }

        function createRenderBody(renderFunc: BaseFunction, sourceCode: SourceCode) {
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

            return `
    {
        ${propsInit}${renderNewText}
    }`.trim();            
        }

        function propertyBodyToSource(property: Property, name: string, sourceCode: SourceCode) {            
            let body = '';
            if (property.shorthand) {
                body = `${name} = ${name};`;
            } else if (property.method) {
                body = sourceCode.getText(property);
            } else {
                // TODO: Special case functions
                body = `${name} = ${sourceCode.getText(property.value)};`;
            }
            return body;
        }
        
        function mapMixinToProperty(property: Property): string[] {
            const sourceCode = context.getSourceCode();
            
            let name: string | number = '';
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
            // TODO: Special Case Default Props and State

            if (name.toLowerCase() === "getdefaultprops") {
                const body = property.value;
                if (body.type !== "FunctionExpression" || body.body.type !== "BlockStatement") {
                    return [
                        `defaultProps = ${name}();`,
                        propertyBodyToSource(property, name, sourceCode)
                    ]
                }
                return [`defaultProps = ${sourceCode.getText((body.body.body as [ReturnStatement])[0].argument!)};`]
            }
            return [propertyBodyToSource(property, name, sourceCode)];
        }

        function formatAndReplace(callExpression: CallExpression, fixer: Rule.RuleFixer, newBody: string) {
            let parent = callExpression as any;
            while (parent.parent && parent.parent.type !== "Program") {
                parent = parent.parent;
            }

            const formattedBody = prettier.format(newBody, {
                parser: 'babylon',
                tabWidth: 4
            }).trim();
            return fixer.replaceText(parent, formattedBody);
        }

        function getReactFixit(fixer: Rule.RuleFixer): { importFixer: Rule.Fix | null; defaultImport: string | null; imported: string | null } {
            const root = context.getAncestors()[0];
            if (root.type !== "Program") {
                return { importFixer: null, defaultImport: null, imported: null };
            }

            let reactDeclaration: ImportDeclaration | null = null;
            for (const child of root.body) {
                if (child.type !== "ImportDeclaration") {
                    continue;
                }

                if (child.source.value !== 'react') {
                    continue;
                }
                reactDeclaration = child;
            }

            if (!reactDeclaration) {
                const fix: Rule.Fix = { range: [0,0], text: `import { Component } from 'react';\n` };
                return { importFixer: fix, defaultImport: null, imported: 'Component' };
            }

            let defaultImport: string | null = null;
            let lastImportSpecifier: [number, number] | null = null;

            for (const specifier of reactDeclaration.specifiers) {
                if (specifier.type === "ImportDefaultSpecifier") {
                    defaultImport = specifier.local.name;
                } else if (specifier.type === "ImportSpecifier") {
                    if (specifier.imported.name === "Component") {
                        return { importFixer: null, defaultImport: null, imported: specifier.local.name };
                    }
                    lastImportSpecifier = specifier.range!;
                }
            }

            if (lastImportSpecifier) {
                return {
                    importFixer: fixer.insertTextAfterRange(lastImportSpecifier, ", Component"),
                    defaultImport: null,
                    imported: "Component"
                };
            } else if (defaultImport) {
                return { importFixer: null, defaultImport, imported: null };   
            }
            return { importFixer: null, defaultImport: null, imported: null };
        }

        //----------------------------------------------------------------------
        // Fixits
        //----------------------------------------------------------------------
        function componentFixit(this: Rule.ReportDescriptor, fixer: Rule.RuleFixer): Rule.Fix[] {
            const calli = (this as any)["node"] as CallExpression;
            const sourceCode = context.getSourceCode();

            const {displayName, className} = getComponentNames(calli);
            const imports = getReactFixit(fixer);
            const importName = imports.imported ? imports.imported : `${(imports.defaultImport || "React")}.Component}`;

            let componentOptions: ObjectExpression | null = null;
            if (calli.arguments.length === 3) {
                if (calli.arguments[1].type !== "ObjectExpression") {
                    console.debug("Non-object expressions not support.");
                    return [];
                }
                componentOptions = calli.arguments[1] as ObjectExpression;
            }

            const renderFunc = calli.arguments[calli.arguments.length === 3 ? 2 : 1] as FunctionExpression;
            const renderBody = createRenderBody(renderFunc, sourceCode);

            const constructorLines: string[] = [];
            const bodyProps = [`render() ${renderBody}`];
            const staticProps = [`displayName = '${displayName}';`];

            if (componentOptions) {
                for (const property of componentOptions.properties) {
                    if (property.key.type === "Identifier" && property.key.name === "getInitialState") {
                        const body = property.value;
                        if (body.type !== "FunctionExpression" || body.body.type !== "BlockStatement") {
                            bodyProps.push(propertyBodyToSource(property, 'getInitialState', sourceCode));
                            constructorLines.push(`this.state = getInitialState();`);
                        } else {
                            const stateBody = sourceCode.getText(((body as FunctionExpression).body.body as [ReturnStatement])[0].argument!)
                            constructorLines.push(`this.state = ${stateBody};`);
                        }
                        continue;
                    }

                    const text = mapMixinToProperty(property);
                    if (text) {
                        bodyProps.push(...text);
                    }
                }
            }

            const classBody: string[] = [];
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
            
            const fixits: Array<Rule.Fix> = [];

            if (imports.importFixer) {
                fixits.push(imports.importFixer);
            }
            fixits.push(formatAndReplace(calli, fixer, classBody.join('\n')));
            return fixits;
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            "CallExpression": function(node) {
                const calli = node as CallExpression;
                const componentName = getComponentExportName();
                if (!componentName) {
                    return;
                }

                if (calli.callee.type !== "Identifier" || calli.callee.name !== componentName) {
                    return;
                }
                
                const callForm = getComponentCallForm(calli);

                switch (callForm) {
                    case ComponentCallForm.Function:
                        context.report({
                            messageId: "omniscient.usage-deprecated",
                            node: node,
                            fix: componentFixit as any
                        });
                        return;
                    case ComponentCallForm.Component:                    
                        context.report({
                            messageId: "omniscient.usage-deprecated",
                            node: node,
                            fix: componentFixit as any
                        });
                        return;
                    default:
                        context.report({
                            node: node,
                            messageId: "omniscient.usage-deprecated"
                        });
                }

                return;
            }
        };
    }
};

export default omniscientComponentRule;