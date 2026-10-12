import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    {
        ignores: ['dist', 'node_modules'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_' },
            ],
        },
    },
    {
        files: [
            'src/database/migrations/**/*.js',
            'src/database/seeders/**/*.js',
        ],
        languageOptions: {
            sourceType: 'commonjs',
            globals: {
                module: 'writable',
                require: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
)
