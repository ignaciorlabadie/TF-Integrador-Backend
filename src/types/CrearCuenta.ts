import type { Rol } from './Rol.js'

export interface CrearCuenta {
    email: string
    password: string
    rol: Rol
    activo?: boolean
}
