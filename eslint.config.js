import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "node_modules/**",
      ".turbo/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "pnpm-lock.yaml"
    ]
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-empty": "error",
      "no-console": ["error", { "allow": ["warn", "error"] }]
    }
  }
];
