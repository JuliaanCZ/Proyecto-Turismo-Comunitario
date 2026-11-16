export default [
  { ignores: ['coverage/**', 'data/**'] },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      eqeqeq: 'error',
      'no-constant-condition': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': 'error',
      'no-undef': 'error',
    },
  },
];
