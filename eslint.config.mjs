/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
]
