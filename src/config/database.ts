
import { Sequelize } from 'sequelize'
import 'dotenv/config'

const databaseUrl = process.env.DATABASE_URL

const sequelize = databaseUrl
    ? new Sequelize(databaseUrl, {
          dialect: 'postgres',
          logging:
              process.env.NODE_ENV === 'development'
                  ? console.log
                  : false,
          dialectOptions: {
              ssl: {
                  require: true,
                  rejectUnauthorized: true,
              },
          },
          pool: {
              max: 5,
              min: 0,
              acquire: 30000,
              idle: 10000,
          },
      })
    : new Sequelize(
          process.env.DB_NAME || 'tfi_turnos',
          process.env.DB_USER || 'postgres',
          process.env.DB_PASSWORD || 'postgres',
          {
              host: process.env.DB_HOST || 'localhost',
              port: Number(process.env.DB_PORT) || 5432,
              dialect: 'postgres',
              logging:
                  process.env.NODE_ENV === 'development'
                      ? console.log
                      : false,
              pool: {
                  max: 5,
                  min: 0,
                  acquire: 30000,
                  idle: 10000,
              },
          },
      )

export default sequelize
