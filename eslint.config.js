import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'blob-report/**', 'test-results/**', '.wrangler/**'] },

  // Application + worker + shared code
  {
    files: ['app/**/*.{ts,tsx}', 'worker/**/*.ts', 'shared/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },

  /**
   * Test-suite rules. These are the automation-quality guardrails from
   * docs/08-selector-and-flake-policy.md, machine-enforced: a hard-coded wait or
   * a conditional assertion fails the build rather than quietly rotting the suite.
   */
  {
    files: ['tests/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked, playwright.configs['flat/recommended']],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-element-handle': 'error',
      'playwright/no-eval': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'warn',
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-conditional-expect': 'error',
      'playwright/no-force-option': 'warn',
      'playwright/no-useless-await': 'error',
      'playwright/expect-expect': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/require-top-level-describe': 'off',
      'playwright/valid-title': 'off',
    },
  },

  // Vitest component/unit tests
  {
    files: ['app/**/*.test.{ts,tsx}', 'shared/**/*.test.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },

  // Build/tooling config files
  {
    files: ['*.config.{ts,js}', 'scripts/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
);
