import path from 'node:path'
import swaggerJsdoc from 'swagger-jsdoc'

const routesFiles = path
    .join(import.meta.dirname, '..', 'routes', '*.{ts,js}')
    .replaceAll('\\', '/')

const usuarioSchema = {
    type: 'object',
    description: 'Cuenta de usuario del sistema.',
    required: ['id', 'email', 'rol', 'activo', 'createdAt', 'updatedAt'],
    properties: {
        id: { type: 'integer', example: 1 },
        email: {
            type: 'string',
            format: 'email',
            example: 'admin@tfi.local.com',
        },
        rol: {
            type: 'string',
            enum: ['PACIENTE', 'PROFESIONAL', 'ADMIN'],
            example: 'ADMIN',
        },
        activo: { type: 'boolean', example: true },
        createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-10-10T12:00:00.000Z',
        },
        updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-10-10T12:00:00.000Z',
        },
    },
}

const pacienteSchema = {
    type: 'object',
    description: 'Paciente con su cuenta de usuario asociada.',
    required: [
        'id',
        'usuarioId',
        'nombre',
        'apellido',
        'dni',
        'telefono',
        'fechaNacimiento',
        'direccion',
        'createdAt',
        'updatedAt',
        'usuario',
    ],
    properties: {
        id: { type: 'integer', example: 1 },
        usuarioId: { type: 'integer', example: 4 },
        nombre: { type: 'string', example: 'Juan' },
        apellido: { type: 'string', example: 'Perez' },
        dni: { type: 'string', example: '30111222' },
        telefono: { type: 'string', example: '+5491112345678' },
        fechaNacimiento: {
            type: 'string',
            format: 'date',
            example: '1990-05-14',
        },
        direccion: { type: 'string', example: 'Av. Siempreviva 742' },
        createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-10-10T12:00:00.000Z',
        },
        updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-10-10T12:00:00.000Z',
        },
        usuario: { $ref: '#/components/schemas/Usuario' },
    },
}

const datosPaciente = {
    email: {
        type: 'string',
        format: 'email',
        description: 'Email único de la cuenta.',
        example: 'paciente@example.com',
    },
    password: {
        type: 'string',
        format: 'password',
        minLength: 8,
        maxLength: 72,
        description: 'Contraseña de 8 a 72 caracteres.',
        example: 'Password123',
    },
    nombre: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        example: 'Ana',
    },
    apellido: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        example: 'Gomez',
    },
    dni: {
        type: 'string',
        pattern: '^[0-9]{7,8}$',
        description: 'Entre 7 y 8 dígitos. Debe ser único.',
        example: '12345678',
    },
    telefono: {
        type: 'string',
        pattern: '^\\+?[0-9]{6,25}$',
        description: 'Entre 6 y 25 dígitos, con prefijo + opcional.',
        example: '+5491112345678',
    },
    fechaNacimiento: {
        type: 'string',
        format: 'date',
        description: 'Fecha YYYY-MM-DD, no futura.',
        example: '1990-05-14',
    },
    direccion: {
        type: 'string',
        minLength: 3,
        maxLength: 150,
        example: 'Calle Falsa 123',
    },
}

const actualizarPacienteSchema = {
    type: 'object',
    description:
        'Debe enviarse al menos uno de los campos. Los campos no enviados no se modifican.',
    properties: {
        nombre: datosPaciente.nombre,
        apellido: datosPaciente.apellido,
        dni: datosPaciente.dni,
        telefono: datosPaciente.telefono,
        fechaNacimiento: datosPaciente.fechaNacimiento,
        direccion: datosPaciente.direccion,
    },
}

const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'API Sistema de Turnos',
            version: '1.0.0',
            description:
                'Sistema web para la gestión de turnos de un consultorio médico y administración interna de profesionales.',
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Desarrollo local',
            },
            {
                url: 'https://tf-integrador-backend.onrender.com/api',
                description: 'Producción (Render)',
            },
        ],
        tags: [
            {
                name: 'Auth',
                description: 'Autenticación y recuperación de contraseña.',
            },
            {
                name: 'Usuarios',
                description:
                    'Gestión de cuentas. El alta de pacientes se realiza en POST /pacientes.',
            },
            {
                name: 'Pacientes',
                description: 'Registro y gestión de pacientes.',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description:
                        'Token JWT obtenido en POST /auth/login. Formato: `Bearer <token>`.',
                },
            },
            schemas: {
                ErrorResponse: {
                    type: 'object',
                    required: ['mensaje'],
                    properties: {
                        mensaje: {
                            type: 'string',
                            example: 'Error de ejemplo',
                        },
                    },
                },
                MensajeResponse: {
                    type: 'object',
                    required: ['mensaje'],
                    properties: {
                        mensaje: {
                            type: 'string',
                            example: 'Operación realizada correctamente',
                        },
                    },
                },
                Usuario: usuarioSchema,
                UsuarioResumen: {
                    type: 'object',
                    description: 'Datos públicos de una cuenta sin timestamps.',
                    required: ['id', 'email', 'rol', 'activo'],
                    properties: {
                        id: { type: 'integer', example: 6 },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'profesional@example.com',
                        },
                        rol: {
                            type: 'string',
                            enum: ['PACIENTE', 'PROFESIONAL', 'ADMIN'],
                            example: 'PROFESIONAL',
                        },
                        activo: { type: 'boolean', example: true },
                    },
                },
                CrearUsuarioRequest: {
                    type: 'object',
                    required: ['email', 'password', 'rol'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Email único de la cuenta.',
                            example: 'profesional@example.com',
                        },
                        password: {
                            type: 'string',
                            format: 'password',
                            minLength: 8,
                            maxLength: 72,
                            description: 'Contraseña de 8 a 72 caracteres.',
                            example: 'Password123',
                        },
                        rol: {
                            type: 'string',
                            enum: ['PROFESIONAL', 'ADMIN'],
                            description:
                                'Solo PROFESIONAL o ADMIN. El alta de PACIENTE se realiza en POST /pacientes.',
                            example: 'PROFESIONAL',
                        },
                        activo: {
                            type: 'boolean',
                            default: true,
                            description: 'Estado inicial de la cuenta.',
                        },
                    },
                },
                ActualizarUsuarioRequest: {
                    type: 'object',
                    description:
                        'Debe enviarse al menos uno de los campos. Solo un ADMIN puede modificar activo.',
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Nuevo email único.',
                            example: 'nuevo@example.com',
                        },
                        password: {
                            type: 'string',
                            format: 'password',
                            minLength: 8,
                            maxLength: 72,
                            description:
                                'Nueva contraseña de 8 a 72 caracteres.',
                            example: 'NuevaPassword123',
                        },
                        activo: {
                            type: 'boolean',
                            description: 'Solo un ADMIN puede modificarlo.',
                        },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'admin@tfi.local.com',
                        },
                        password: {
                            type: 'string',
                            format: 'password',
                            example: 'Password123',
                        },
                    },
                },
                LoginResponse: {
                    type: 'object',
                    required: ['token', 'usuario'],
                    properties: {
                        token: {
                            type: 'string',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        },
                        usuario: {
                            $ref: '#/components/schemas/UsuarioResumen',
                        },
                    },
                },
                ForgotPasswordRequest: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'usuario@example.com',
                        },
                    },
                },
                ResetPasswordRequest: {
                    type: 'object',
                    required: ['token', 'password'],
                    properties: {
                        token: {
                            type: 'string',
                            description: 'Token recibido por email.',
                            example: 'token-recibido-por-email',
                        },
                        password: {
                            type: 'string',
                            format: 'password',
                            minLength: 8,
                            maxLength: 72,
                            example: 'NuevaPassword123',
                        },
                    },
                },
                CrearPacienteRequest: {
                    type: 'object',
                    required: [
                        'email',
                        'password',
                        'nombre',
                        'apellido',
                        'dni',
                        'telefono',
                        'fechaNacimiento',
                        'direccion',
                    ],
                    properties: datosPaciente,
                },
                ActualizarPacienteRequest: actualizarPacienteSchema,
                Paciente: pacienteSchema,
            },
            responses: {
                DatosInvalidos: {
                    description: 'Datos de entrada inválidos.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
                NoAutenticado: {
                    description: 'Falta el token o no es válido.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
                SinPermisos: {
                    description: 'El usuario no tiene permisos para la acción.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
                NoEncontrado: {
                    description: 'El recurso solicitado no existe.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
                Conflicto: {
                    description:
                        'Conflicto con un recurso existente (por ejemplo, datos duplicados).',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
                ErrorInterno: {
                    description: 'Error interno del servidor.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
            },
        },
    },
    apis: [routesFiles],
}

export const openapiSpec = swaggerJsdoc(options)
