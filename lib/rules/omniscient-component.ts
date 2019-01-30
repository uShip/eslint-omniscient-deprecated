import { Rule } from "eslint";
import { ComponentFixer } from "./helpers/ComponentFixer";
import { CallExpression } from "estree";

/**
 * @fileoverview Usage of omniscient component
 * @author Richard Simpson
 */

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------
export interface OmniscientComponentRuleOptions {
    /**
     * The module to use for components that fail the immutable hueristic.
     * @default "React"
     */
    componentModule: string;
    /**
     * The name of the import to use for components that fail the immutable hueristic.
     * @default "Component"
     */
    componentImport: string;
    /**
     * The module to use for components that pass the immutable hueristic,
     * but have mixins.
     * Ex: pureComponentModule: "@uship/components"
     */
    pureComponentModule: string | null;
    /**
     * The name of the import to use for components that pass the immutable hueristic,
     * but have mixins. If not provided, falls back to componentImport with shouldComponentUpdate
     * set to shouldUpdateImport.
     * This import is assumed to have it's own Immutable.js compatible
     * shouldComponentUpdate implementation. Useed
     */
    pureComponentImport: string | null;
    /**
     * The module to use for components that pass an immutable hueristic and have no mixins.
     */
    memoModule: string | null;
    /**
     * The name of the import to use for components that pass an immutable hueristic and have no mixins.
     */
    memoImport: string | null;
    /**
     * Whether or not the memoImport takes areEqualImport as it's second parameter.
     */
    passAreEqualToMemo: boolean;
    /**
     * The module in which resides a areEqual function
     * that can handle Immutable.js comparisions.
     */
    areEqualModule: string;
    /**
     * The name of the imported areEqual function that
     * can handle Immutable.js comparisions.
     * Used by memoImport when an omniscient component has no mixins,
     * and componentImport if one does and no pureComponentImport was
     * provided. Is passed the previous and next props and additionally
     * the previous and next state, if applicable.
     */
    areEqualImport: string;
    /**
     * Whether or not fix render `this` issues by using class properties
     * or by attempting to apply a `.bind(this)` hueristic.
     * @default true
     */
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
                    memoModule: { type: "string" },
                    memoImport: { type: "string" },
                    areEqualModule: { type: "string" },
                    areEqualImport: { type: "string" },
                    useClassProperties: { type: "boolean" },
                },
                required: ["shouldUpdateModule", "shouldUpdateImport"],
            },
        ],
    },

    create(context) {
        let options: OmniscientComponentRuleOptions = {
            componentModule: "react",
            componentImport: "Component",
            pureComponentModule: null,
            pureComponentImport: null,
            memoModule: null,
            memoImport: null,
            areEqualModule: null as any,
            areEqualImport: null as any,
            passAreEqualToMemo: true,
            useClassProperties: true,
        };

        if (context.options[0]) {
            options = { ...options, ...context.options[0] };
        }

        const componentFixer = new ComponentFixer(context, options);

        const omniscientImport = componentFixer.getOmniscientImportName();

        if (omniscientImport == null) {
            return {};
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------
        return {
            [`CallExpression[callee.name='${omniscientImport}']`]: function(node: CallExpression) {
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
