import { defineConfig } from "oxlint";

// export default defineConfig({
//   categories: {
//     correctness: "warn",
//   },
//   rules: {
//     "eslint/no-unused-vars": "error",
//   },
// });

export default defineConfig({
  plugins: ["react", "typescript", "react-perf", "promise", "jsx-a11y"],
  categories: {
    // these are all mostly interesting
    correctness: "error",
    suspicious: "error",
    perf: "error",
    // wayyyy too much
    style: "off",
    restriction: "off",
    pedantic: "off",
  },
  rules: {
    // not needed for modern React
    "react/react-in-jsx-scope": "off",
    // nice sometimes but infuriating too often (e.g. `type` discriminators)
    "eslint/sort-keys": "off",
    // who cares
    "eslint/func-style": "off",
    // just no
    "react/jsx-max-depth": "off",
    // oh get out
    "eslint/no-ternary": "off",
    // annoyingly, doesn't auto-fix (because dangerous I guess)
    "eslint/sort-imports": "off",
    // you're not my english teacher
    "eslint/capitalized-comments": "off",
    // yes, but some numbers are well-known
    "eslint/no-magic-numbers": [
      "error",
      { ignore: [-1, 0, 1, 2, 24, 60, 1000] },
    ],
    // bobbins: new values as props to built-ins are fine
    "react-perf/jsx-no-new-function-as-prop": "off",
    // same as react-perf/jsx-no-new-function-as-prop
    "react-perf/jsx-no-new-object-as-prop": "off",
    // sometimes you gotta though
    "react/no-array-index-key": "off",
    // this comes up way too much in plumbing code
    "typescript/no-unsafe-type-assertion": "off",
  },
  settings: {
    "jsx-a11y": {
      polymorphicPropName: undefined,
      components: {},
      attributes: {},
    },
    next: {
      rootDir: [],
    },
    react: {
      formComponents: [],
      linkComponents: [],
      version: undefined,
      componentWrapperFunctions: [],
    },
    jsdoc: {
      ignorePrivate: false,
      ignoreInternal: false,
      ignoreReplacesDocs: true,
      overrideReplacesDocs: true,
      augmentsExtendsReplacesDocs: false,
      implementsReplacesDocs: false,
      exemptDestructuredRootsFromChecks: false,
      tagNamePreference: {},
    },
    vitest: {
      typecheck: false,
    },
  },
  env: {
    builtin: true,
  },
  globals: {},
  ignorePatterns: [],
});
