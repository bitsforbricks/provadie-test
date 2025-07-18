module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['react', '@typescript-eslint'],
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.mts'],
      extends: ['plugin:@typescript-eslint/strict'],
      parserOptions: {
        project: ['./tsconfig.json'],
      },
      rules: {
        "@typescript-eslint/prefer-for-of": "off",
        "@typescript-eslint/prefer-nullish-coalescing": "off",
        "@typescript-eslint/no-unused-vars": ["error"],
        eqeqeq: "error"
      }
    },
  ],
};
