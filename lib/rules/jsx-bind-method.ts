/**
 * @fileoverview Methods that are passed into JSX expression should bind this.
 * @author Richard Simpson
 */
import { Rule } from "eslint";
import ESTree, { BaseStatement, Expression, BaseNode, BaseExpression, BasePattern } from "estree";

interface JSXAttribute extends BaseStatement {
    type: "JSXAttribute";
    name: JSXIdentifier;
    value: BaseStatement;
}

interface JSXIdentifier extends BaseNode, BaseExpression, BasePattern {
    type: "JSXIdentifier";
    name: string;
}

interface JSXExpressionContainer extends BaseStatement {
    type: "JSXExpressionContainer";
    expression: Expression;
}

const JsxBindMethodRule: Rule.RuleModule = {
    meta: {
        docs: {
            description: "Methods that are passed into JSX expression should bind this.",
            category: "JSX Gotchas",
            recommended: true,
        },
        fixable: "code",
        messages: {
            "omniscient.conversion-issues.jsx-bind":
                "Make sure that you're properly binding methods to this `this` when passing them into JSX attributes.",
        },
    },

    create(context) {
        function bindFixit(node: JSXAttribute) {
            return (fixer: Rule.RuleFixer) => {
                return fixer.insertTextAfter((node["value"] as any).expression, ".bind(this)");
            };
        }

        return {
            JSXAttribute(node: ESTree.Node) {
                const jsx = (node as any) as JSXAttribute;
                if (jsx.name.type !== "JSXIdentifier" || !jsx.name.name.startsWith("on")) {
                    return;
                }

                if (jsx.value.type !== "JSXExpressionContainer") {
                    return;
                }

                const expressionContainer = jsx.value as JSXExpressionContainer;
                if (expressionContainer.expression.type !== "MemberExpression") {
                    return;
                }

                context.report({
                    messageId: "omniscient.conversion-issues.jsx-bind",
                    node: node,
                    fix: bindFixit(jsx),
                });
                return;
            },
        };
    },
};

export default JsxBindMethodRule;
