import 'dotenv/config'
import process from 'node:process'

const databaseUrl = process.env.DATABASE_URL

const configuracion = {
    dialect: 'postgres',
    logging: false,
}

export default {
    development: databaseUrl
    ? {
              ...configuracion,
              use_env_variable: 'DATABASE_URL',
              dialectOptions: {
                  ssl: {
                      require: true,
                      rejectUnauthorized: true,
                  },
              },
          }
        : {
              ...configuracion,
              username: process.env.DB_USER || 'postgres',
              password: process.env.DB_PASSWORD || 'postgres',
              database: process.env.DB_NAME || 'tfi_turnos',
              host: process.env.DB_HOST || 'localhost',
              port: Number(process.env.DB_PORT) || 5432,
          },
}