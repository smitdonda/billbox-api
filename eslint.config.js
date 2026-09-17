const globals = require("globals");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "backups/**",
      ".vercel/**",
      "coverage/**",
      "src/public/**",
    ],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-undef": "error",
      "require-atomic-updates": "off",
      "no-constant-condition": ["error", { checkLoops: false }],
    },
  },
];
