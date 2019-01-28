import { Rule } from "eslint";
import { ComponentFixer } from "./helpers/generateClass";
import { CallExpression } from "estree";

/**
 * @fileoverview Usage of omniscient component
 * @author Richard Simpson
 */

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------
export interface OmniscientComponentRuleOptions {
    componentModule: string;
    componentImport: string;
    pureComponentModule: string;
    pureComponentImport: string;
    canUseReactMemo: boolean;
    useClassProperties: boolean;
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
            "omniscient.usage-deprecated":
                "Usage of omniscient components is deprecated. You should use an immutable compatible component instead.",
        },
        schema: [
            {
                type: "object",
                properties: {
                    componentImport: { type: "string" },
                    componentModule: { type: "string" },
                    pureComponentModule: { type: "string" },
                    pureComponentImport: { type: "string" },
                    canUseReactMemo: { type: "boolean" },
                    useClassProperties: { type: "boolean" },
                },
            },
        ],
    },

    create(context) {
        let options: OmniscientComponentRuleOptions = {
            componentModule: "react",
            componentImport: "Component",
            pureComponentModule: "react",
            pureComponentImport: "PureComponent",
            canUseReactMemo: false,
            useClassProperties: true,
        };

        if (context.options[0]) {
            options = { ...options, ...context.options[0] };
        }

        const componentFixer = new ComponentFixer(context, options);

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {
            CallExpression: function(node) {
                const calli = node as CallExpression;
                if (!componentFixer.isError(calli)) {
                    return;
                }

                if (componentFixer.canFix(calli)) {
                    context.report({
                        messageId: "omniscient.usage-deprecated",
                        node: node,
                        fix: componentFixer.getFixit(calli) as any,
                    });
                } else {
                    context.report({
                        node: node,
                        messageId: "omniscient.usage-deprecated",
                    });
                }

                return;
            },
        };
    },
};

export default omniscientComponentRule;
