import { Rule } from "eslint";
import { ImportDeclaration } from "estree";

const RemoveOmniscientImport: Rule.RuleModule = {
    meta: {
        docs: {
            description: "Import of omniscient",
            category: "uship.omniscient",
            recommended: true,
        },
        fixable: "code",
    },

    create(context) {
        function importFixit(node: ImportDeclaration): (fixer: Rule.RuleFixer) => Rule.Fix {
            return (fixer: Rule.RuleFixer) => {
                return fixer.removeRange([node.range![0], node.range![1] + 1]);
            };
        }

        return {
            ImportDeclaration: function(node) {
                const importNode = node as ImportDeclaration;
                if (importNode.source.value !== "omniscient") {
                    return;
                }

                const vars = context.getDeclaredVariables(node);
                if (vars.some(v => v.references.length > 0)) {
                    return;
                }

                context.report({
                    message: "Remove unused reference to omniscient.",
                    node,
                    fix: importFixit(importNode),
                });
            },
        };
    },
};

export default RemoveOmniscientImport;
