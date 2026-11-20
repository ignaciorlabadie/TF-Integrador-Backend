import { spawnSync } from 'node:child_process'
import process from 'node:process'

import { config } from 'dotenv'

config({ path: '.env.e2e', quiet: true })

const resultado = spawnSync(
    process.execPath,
    [
        'node_modules/sequelize-cli/lib/sequelize',
        'db:migrate',
        '--config',
        'src/config/config.js',
        '--migrations-path',
        'src/database/migrations',
        '--env',
        'test',
    ],
    {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test', DOTENV_QUIET: 'true' },
    },
)

process.exit(resultado.status ?? 1)
