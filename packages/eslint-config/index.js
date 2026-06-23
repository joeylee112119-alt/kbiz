export default [
  {
    ignores: ["dist/**", ".next/**", "node_modules/**", "coverage/**"]
  },
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-empty": "error"
    }
  }
];
