import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

config({ path: '.env.e2e', quiet: true })

export default defineConfig({
    test: {
        include: ['tests/e2e/**/*.test.ts'],
        setupFiles: ['./tests/e2e/setup.ts'],
        env: {
            NODE_ENV: 'test',
            DOTENV_QUIET: 'true',
            DATABASE_URL: '',
            DB_HOST: process.env.E2E_DB_HOST || 'localhost',
            DB_PORT: String(process.env.E2E_DB_PORT || 5433),
            DB_NAME: process.env.E2E_DB_NAME || 'tfi_turnos_test',
            DB_USER: process.env.E2E_DB_USER || 'postgres',
            DB_PASSWORD: process.env.E2E_DB_PASSWORD || 'postgres',
            JWT_SECRET: process.env.JWT_SECRET || 'secreto-de-e2e',
            JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
            BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS || '4',
            FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
            SUPABASE_URL:
                process.env.SUPABASE_URL || 'https://test.supabase.co',
            SUPABASE_SERVICE_ROLE_KEY:
                process.env.SUPABASE_SERVICE_ROLE_KEY ||
                'service-role-de-prueba',
        },
        fileParallelism: false,
        testTimeout: 30000,
        hookTimeout: 30000,
    },
})
