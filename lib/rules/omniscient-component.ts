import { Rule } from "eslint";
import { Program, ImportDeclaration, CallExpression, Literal, Node as EsNode, Identifier, BaseFunction } from "estree";

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
        fixable: "code"
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

        //----------------------------------------------------------------------
        // Fixits
        //----------------------------------------------------------------------
        function functionComponentFixit(this: Rule.ReportDescriptorLocation, fixer: Rule.RuleFixer) {
            const calli = (this as any)["node"] as CallExpression;
            const sourceCode = context.getSourceCode();
        
            const displayName = (calli.arguments[0] as Literal).value;
            const parent = (calli as any)["parent"] as EsNode;
            const componentName = parent.type === "VariableDeclarator" ? (parent.id as Identifier).name : displayName;

            const renderFunc = calli.arguments[1] as any as BaseFunction;
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

            renderNewText = `{
        ${propsInit}${renderNewText}
    }`;

            const newBody = `
class ${componentName} extends React.Component {
    render() ${renderNewText}
}

${componentName}.displayName = '${displayName}';
            `.trim();

            return fixer.replaceText((parent as any).parent, newBody);
        }

        function componentFixit(this: Rule.ReportDescriptor, fixer: Rule.RuleFixer) {
            // Do Stuff
            return null;
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {

            ImportDeclaration(node) {
                const importDeclaration = node as ImportDeclaration;
                if (importDeclaration.source.value === "omniscient") {
                    context.report({
                        message: "Usage of omniscient components are deprecated",
                        loc: node.loc!,
                        messageId: "uship.omniscient.import",
                        fix: (fixer) => {
                            return fixer.replaceText(node, "");
                        }
                    });
                }
            },
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
                            message: "Usage of omniscient components is deprecated. You should use an immutable compatible component instead.",
                            messageId: "uship.omniscient.usage",
                            node: node,
                            fix: functionComponentFixit
                        });
                        return;
                    case ComponentCallForm.Component:                    
                        context.report({
                            message: "Usage of omniscient components is deprecated. You should use an immutable compatible component instead.",
                            messageId: "uship.omniscient.usage",
                            node: node,
                            fix: componentFixit
                        });
                        return;
                    default:
                        context.report({
                            message: "Usage of omniscient components are deprecated. You shold replace this with a React.Component or React.memo equivalent.",
                            node: node,
                            messageId: "uship.omniscient.usage"
                        });
                }

                return;
            }
        };
    }
};

export default omniscientComponentRule;