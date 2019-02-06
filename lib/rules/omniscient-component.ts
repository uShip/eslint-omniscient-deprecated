import { Rule } from "eslint";
import { ComponentFixer } from "./helpers/ComponentFixer";
import { CallExpression, Node as EsNode, VariableDeclarator, MemberExpression } from "estree";

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
                    passAreEqualToMemo: { type: "boolean" },
                    useClassProperties: { type: "boolean" },
                },
                dependencies: {
                    componentModule: ["componentImport"],
                    componentImport: ["componentModule"],
                    pureComponentModule: ["pureComponentImport"],
                    pureComponentImport: ["pureComponentModule"],
                    memoModule: ["memoImport"],
                    memoImport: ["memoModule"],
                    areEqualModule: ["areEqualImport"],
                    areEqualImport: ["areEqualModule"],
                    passAreEqualToMemo: ["memoModule", "memoImport"],
                },
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

        const omniscientImport = ComponentFixer.getOmniscientImportName(context);

        if (omniscientImport == null) {
            return {};
        }

        let componentFixer: ComponentFixer | null = null;

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------
        return {
            [`CallExpression[callee.name='${omniscientImport}']`]: function(node: EsNode) {
                componentFixer = new ComponentFixer(context, options, node as CallExpression);
                return;
            },
            // Check if we're using children prop in render body. Since ESLint doesn't expose visitors (sad),
            // we have to piggy back on create as a dum visitor
            VariableDeclarator: function(node: EsNode) {
                const variableDeclaration = node as VariableDeclarator;

                // If we're not in a call context, or we've already determined this call uses children,
                // exit.
                if (!componentFixer || componentFixer.usesChildrenInBody) {
                    return;
                }

                if (variableDeclaration.init == null || variableDeclaration.id.type !== "ObjectPattern") {
                    return;
                }

                // Check if we're destructing the props. If so, short curcuit
                const renderFunction = componentFixer.renderFunction;
                const renderProps = ComponentFixer.getRenderProps(renderFunction);
                if (!renderProps.hasProps || renderProps.isObjectPattern) {
                    return;
                }

                if (
                    variableDeclaration.init.type !== "Identifier" ||
                    renderProps.props !== variableDeclaration.init.name
                ) {
                    return;
                }

                // Check if our ancestor is the render func
                const ancestors = context.getAncestors();
                if (!ancestors.some(anc => anc == renderFunction)) {
                    return;
                }

                const variables = context.getDeclaredVariables(node);
                componentFixer.usesChildrenInBody = variables.some(v => v.identifiers.some(i => i.name === "children"));
            },
            MemberExpression: function(node: EsNode) {
                const memberExpression = node as MemberExpression;

                // If we're not in a call context, or we've already determined this call uses children,
                // exit.
                if (!componentFixer || componentFixer.usesChildrenInBody) {
                    return;
                }

                // Check if we're destructing the props. If so, short curcuit
                const renderFunction = componentFixer.renderFunction;
                const renderProps = ComponentFixer.getRenderProps(renderFunction);
                if (!renderProps.hasProps || renderProps.isObjectPattern) {
                    return;
                }

                // Check if our ancestor is the render func
                const ancestors = context.getAncestors();
                if (!ancestors.some(anc => anc == renderFunction)) {
                    return;
                }

                if (memberExpression.object.type !== "Identifier") {
                    return;
                }

                // Check if we're accessing the render props
                if (memberExpression.object.name !== renderProps.props) {
                    return;
                }

                // If we're using a weird props access, assume we can analyze it.
                if (
                    memberExpression.computed ||
                    (memberExpression.property.type !== "Literal" && memberExpression.property.type !== "Identifier")
                ) {
                    componentFixer.unknownPropsAccess = true;
                    return;
                }

                switch (memberExpression.property.type) {
                    case "Identifier":
                        componentFixer.usesChildrenInBody = memberExpression.property.name === "children";
                        break;
                    case "Literal":
                        componentFixer.usesChildrenInBody = memberExpression.property.value === "children";
                        break;
                }
            },
            [`CallExpression[callee.name='${omniscientImport}']:exit`]: function(node: EsNode) {
                if (componentFixer == null) {
                    throw Error("wat");
                }
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

                componentFixer = null;
                return;
            },
        };
    },
};

export default omniscientComponentRule;
