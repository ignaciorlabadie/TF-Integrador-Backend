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

const idEntero = { type: 'integer', minimum: 1, example: 1 }

const timestamps = {
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
}

const diaSemana = {
    type: 'string',
    enum: [
        'LUNES',
        'MARTES',
        'MIERCOLES',
        'JUEVES',
        'VIERNES',
        'SABADO',
        'DOMINGO',
    ],
    example: 'LUNES',
}

const hora = {
    type: 'string',
    pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$',
    description: 'Hora en formato HH:mm.',
    example: '09:00',
}

const fechaISO = {
    type: 'string',
    format: 'date',
    description: 'Fecha en formato YYYY-MM-DD.',
    example: '2026-11-20',
}

const profesionalSchema = {
    type: 'object',
    description: 'Perfil profesional con su cuenta de usuario asociada.',
    required: [
        'id',
        'usuarioId',
        'nombre',
        'apellido',
        'dni',
        'telefono',
        'matricula',
        'especialidad',
        'createdAt',
        'updatedAt',
    ],
    properties: {
        id: idEntero,
        usuarioId: { type: 'integer', example: 6 },
        nombre: { type: 'string', example: 'Maria' },
        apellido: { type: 'string', example: 'Lopez' },
        dni: { type: 'string', example: '23456789' },
        telefono: { type: 'string', example: '+5491112345678' },
        matricula: { type: 'string', example: 'MP-12345' },
        especialidad: { type: 'string', example: 'Clínica médica' },
        ...timestamps,
        usuario: { $ref: '#/components/schemas/Usuario' },
    },
}

const crearProfesionalSchema = {
    type: 'object',
    required: [
        'usuarioId',
        'nombre',
        'apellido',
        'dni',
        'telefono',
        'matricula',
        'especialidad',
    ],
    properties: {
        usuarioId: {
            type: 'integer',
            minimum: 1,
            description: 'ID de una cuenta existente con rol PROFESIONAL.',
            example: 6,
        },
        nombre: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Maria',
        },
        apellido: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Lopez',
        },
        dni: {
            type: 'string',
            pattern: '^[0-9]{7,8}$',
            example: '23456789',
        },
        telefono: {
            type: 'string',
            pattern: '^\\+?[0-9]{6,25}$',
            example: '+5491112345678',
        },
        matricula: {
            type: 'string',
            minLength: 1,
            maxLength: 30,
            description: 'Matrícula única del profesional.',
            example: 'MP-12345',
        },
        especialidad: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Clínica médica',
        },
    },
}

const actualizarProfesionalSchema = {
    type: 'object',
    description:
        'Debe enviarse al menos uno de los campos. usuarioId no es modificable.',
    properties: {
        nombre: crearProfesionalSchema.properties.nombre,
        apellido: crearProfesionalSchema.properties.apellido,
        dni: crearProfesionalSchema.properties.dni,
        telefono: crearProfesionalSchema.properties.telefono,
        matricula: crearProfesionalSchema.properties.matricula,
        especialidad: crearProfesionalSchema.properties.especialidad,
    },
}

const espacioSchema = {
    type: 'object',
    description: 'Espacio físico del consultorio.',
    required: [
        'id',
        'nombre',
        'tipo',
        'ubicacion',
        'activo',
        'createdAt',
        'updatedAt',
    ],
    properties: {
        id: idEntero,
        nombre: { type: 'string', example: 'Consultorio 1' },
        tipo: {
            type: 'string',
            enum: ['GIMNASIO', 'CONSULTORIO'],
            example: 'CONSULTORIO',
        },
        ubicacion: {
            type: 'string',
            enum: ['ADELANTE', 'ATRAS'],
            example: 'ADELANTE',
        },
        activo: { type: 'boolean', default: true, example: true },
        ...timestamps,
    },
}

const crearEspacioSchema = {
    type: 'object',
    required: ['nombre', 'tipo', 'ubicacion'],
    properties: {
        nombre: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            example: 'Consultorio 1',
        },
        tipo: {
            type: 'string',
            enum: ['GIMNASIO', 'CONSULTORIO'],
            example: 'CONSULTORIO',
        },
        ubicacion: {
            type: 'string',
            enum: ['ADELANTE', 'ATRAS'],
            example: 'ADELANTE',
        },
    },
}

const actualizarEspacioSchema = {
    type: 'object',
    description: 'Debe enviarse al menos uno de los campos.',
    properties: crearEspacioSchema.properties,
}

const asignacionEspacioSchema = {
    type: 'object',
    description:
        'Asignación recurrente (FIJA) o puntual (ESPECIFICA) de un espacio a un profesional.',
    required: [
        'id',
        'espacioId',
        'profesionalId',
        'tipo',
        'horaInicio',
        'horaFin',
        'createdAt',
        'updatedAt',
    ],
    properties: {
        id: idEntero,
        espacioId: { type: 'integer', example: 3 },
        profesionalId: { type: 'integer', example: 2 },
        tipo: {
            type: 'string',
            enum: ['FIJA', 'ESPECIFICA'],
            example: 'FIJA',
        },
        diaSemana: { ...diaSemana, nullable: true },
        fecha: { ...fechaISO, nullable: true },
        horaInicio: hora,
        horaFin: { ...hora, example: '12:00' },
        ...timestamps,
        espacio: { $ref: '#/components/schemas/Espacio' },
        profesional: { $ref: '#/components/schemas/Profesional' },
    },
}

const crearAsignacionEspacioSchema = {
    type: 'object',
    description:
        'FIJA requiere diaSemana y no admite fecha; ESPECIFICA requiere fecha y no admite diaSemana. horaFin debe ser posterior a horaInicio.',
    required: ['espacioId', 'profesionalId', 'tipo', 'horaInicio', 'horaFin'],
    properties: {
        espacioId: { type: 'integer', minimum: 1, example: 3 },
        profesionalId: { type: 'integer', minimum: 1, example: 2 },
        tipo: {
            type: 'string',
            enum: ['FIJA', 'ESPECIFICA'],
            example: 'FIJA',
        },
        diaSemana: { ...diaSemana, nullable: true },
        fecha: { ...fechaISO, nullable: true },
        horaInicio: hora,
        horaFin: { ...hora, example: '12:00' },
    },
}

const actualizarAsignacionEspacioSchema = {
    type: 'object',
    description: 'Debe enviarse al menos uno de los campos.',
    properties: crearAsignacionEspacioSchema.properties,
}

const tarifaEspacioSchema = {
    type: 'object',
    description:
        'Tarifa por hora de un espacio. fechaHasta en null indica que está vigente.',
    required: [
        'id',
        'espacioId',
        'precioPorHora',
        'fechaDesde',
        'createdAt',
        'updatedAt',
    ],
    properties: {
        id: idEntero,
        espacioId: { type: 'integer', example: 3 },
        precioPorHora: {
            type: 'string',
            pattern: '^[0-9]+\\.[0-9]{2}$',
            description: 'Precio decimal con dos decimales.',
            example: '150.00',
        },
        fechaDesde: fechaISO,
        fechaHasta: { ...fechaISO, nullable: true },
        ...timestamps,
        espacio: { $ref: '#/components/schemas/Espacio' },
    },
}

const crearTarifaEspacioSchema = {
    type: 'object',
    required: ['espacioId', 'precioPorHora', 'fechaDesde'],
    properties: {
        espacioId: { type: 'integer', minimum: 1, example: 3 },
        precioPorHora: {
            type: 'number',
            format: 'double',
            minimum: 0.01,
            multipleOf: 0.01,
            description: 'Número mayor a 0 con hasta 2 decimales.',
            example: 150,
        },
        fechaDesde: fechaISO,
        fechaHasta: { ...fechaISO, nullable: true },
    },
}

const actualizarTarifaEspacioSchema = {
    type: 'object',
    description: 'Debe enviarse al menos uno de los campos.',
    properties: crearTarifaEspacioSchema.properties,
}

const agendaSchema = {
    type: 'object',
    description: 'Disponibilidad semanal de un profesional.',
    required: [
        'id',
        'profesionalId',
        'diaSemana',
        'horaInicio',
        'horaFin',
        'duracionTurno',
        'activo',
        'createdAt',
        'updatedAt',
    ],
    properties: {
        id: idEntero,
        profesionalId: { type: 'integer', example: 2 },
        diaSemana,
        horaInicio: hora,
        horaFin: { ...hora, example: '12:00' },
        duracionTurno: {
            type: 'integer',
            minimum: 1,
            description: 'Duración de cada turno en minutos.',
            example: 30,
        },
        activo: { type: 'boolean', default: true, example: true },
        ...timestamps,
        profesional: { $ref: '#/components/schemas/Profesional' },
    },
}

const crearAgendaSchema = {
    type: 'object',
    required: [
        'profesionalId',
        'diaSemana',
        'horaInicio',
        'horaFin',
        'duracionTurno',
    ],
    properties: {
        profesionalId: { type: 'integer', minimum: 1, example: 2 },
        diaSemana,
        horaInicio: hora,
        horaFin: { ...hora, example: '12:00' },
        duracionTurno: {
            type: 'integer',
            minimum: 1,
            example: 30,
        },
    },
}

const actualizarAgendaSchema = {
    type: 'object',
    description:
        'Debe enviarse al menos uno de los campos. profesionalId y activo no son modificables.',
    properties: {
        diaSemana,
        horaInicio: hora,
        horaFin: { ...hora, example: '12:00' },
        duracionTurno: { type: 'integer', minimum: 1, example: 30 },
        cancelarTurnosAfectados: {
            type: 'boolean',
            default: false,
            description:
                'Permite cancelar turnos futuros que queden fuera de la nueva disponibilidad.',
        },
    },
}

const turnoSchema = {
    type: 'object',
    description: 'Turno médico asignado a un paciente en una agenda.',
    required: [
        'id',
        'pacienteId',
        'profesionalId',
        'agendaId',
        'fecha',
        'hora',
        'estado',
        'motivo',
        'createdAt',
        'updatedAt',
    ],
    properties: {
        id: idEntero,
        pacienteId: { type: 'integer', example: 4 },
        profesionalId: { type: 'integer', example: 2 },
        agendaId: { type: 'integer', example: 1 },
        fecha: fechaISO,
        hora,
        estado: {
            type: 'string',
            enum: ['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'COMPLETADO'],
            default: 'PENDIENTE',
            example: 'CONFIRMADO',
        },
        motivo: { type: 'string', example: 'Control de rutina' },
        observaciones: {
            type: 'string',
            nullable: true,
            example: 'Traer análisis previos',
        },
        recordatorioEnviadoAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: null,
        },
        ...timestamps,
        paciente: { $ref: '#/components/schemas/Paciente' },
        profesional: { $ref: '#/components/schemas/Profesional' },
        agenda: { $ref: '#/components/schemas/Agenda' },
    },
}

const crearTurnoSchema = {
    type: 'object',
    description:
        'El estado del turno se define automáticamente como CONFIRMADO.',
    required: [
        'pacienteId',
        'profesionalId',
        'agendaId',
        'fecha',
        'hora',
        'motivo',
    ],
    properties: {
        pacienteId: { type: 'integer', minimum: 1, example: 4 },
        profesionalId: { type: 'integer', minimum: 1, example: 2 },
        agendaId: { type: 'integer', minimum: 1, example: 1 },
        fecha: fechaISO,
        hora,
        motivo: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            example: 'Control de rutina',
        },
        observaciones: {
            type: 'string',
            nullable: true,
            example: 'Traer análisis previos',
        },
    },
}

const actualizarTurnoSchema = {
    type: 'object',
    description: 'Debe enviarse al menos uno de los campos.',
    properties: {
        fecha: fechaISO,
        hora,
        motivo: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            example: 'Control',
        },
        observaciones: { type: 'string', nullable: true, example: null },
        estado: {
            type: 'string',
            enum: ['PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'COMPLETADO'],
            example: 'COMPLETADO',
        },
    },
}

const estudioSchema = {
    type: 'object',
    description: 'Estudio médico de un paciente.',
    required: [
        'id',
        'pacienteId',
        'tipo',
        'fecha',
        'descripcion',
        'createdAt',
        'updatedAt',
    ],
    properties: {
        id: idEntero,
        pacienteId: { type: 'integer', example: 4 },
        tipo: { type: 'string', example: 'Radiografía de tórax' },
        fecha: fechaISO,
        descripcion: { type: 'string', example: 'Control postoperatorio' },
        archivoURL: {
            type: 'string',
            nullable: true,
            description:
                'Ruta del archivo en el storage. No es una URL pública.',
            example: 'estudios/4/archivo.pdf',
        },
        ...timestamps,
        paciente: { $ref: '#/components/schemas/Paciente' },
    },
}

const crearEstudioSchema = {
    type: 'object',
    required: ['tipo', 'fecha', 'descripcion'],
    properties: {
        pacienteId: {
            type: 'integer',
            minimum: 1,
            example: 4,
            description:
                'Obligatorio solo para ADMIN. PACIENTE: se ignora, se deriva del token.',
        },
        tipo: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            example: 'Radiografía',
        },
        fecha: fechaISO,
        descripcion: { type: 'string', example: 'Control postoperatorio' },
        archivo: {
            type: 'string',
            format: 'binary',
            description: 'Opcional. PDF, JPEG o PNG de hasta 10 MB.',
        },
    },
}

const autorizacionEstudioSchema = {
    type: 'object',
    description: 'Autorización para que un profesional acceda a un estudio.',
    required: [
        'id',
        'estudioId',
        'profesionalId',
        'fechaAutorizacion',
        'fechaVencimiento',
        'estado',
        'createdAt',
        'updatedAt',
    ],
    properties: {
        id: idEntero,
        estudioId: { type: 'integer', example: 5 },
        profesionalId: { type: 'integer', example: 2 },
        fechaAutorizacion: fechaISO,
        fechaVencimiento: fechaISO,
        estado: {
            type: 'string',
            enum: ['DISPONIBLE', 'VENCIDO'],
            default: 'DISPONIBLE',
            example: 'DISPONIBLE',
        },
        ...timestamps,
    },
}

const crearAutorizacionEstudioSchema = {
    type: 'object',
    required: [
        'estudioId',
        'profesionalId',
        'fechaAutorizacion',
        'fechaVencimiento',
    ],
    properties: {
        estudioId: { type: 'integer', minimum: 1, example: 5 },
        profesionalId: { type: 'integer', minimum: 1, example: 2 },
        fechaAutorizacion: fechaISO,
        fechaVencimiento: fechaISO,
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
            {
                name: 'Profesionales',
                description: 'Perfiles profesionales y sus cuentas de usuario.',
            },
            {
                name: 'Roles',
                description: 'Catálogo de roles disponibles en el sistema.',
            },
            {
                name: 'Turnos',
                description:
                    'Creación, consulta, reprogramación y cancelación de turnos.',
            },
            {
                name: 'Agendas',
                description: 'Disponibilidad semanal de los profesionales.',
            },
            {
                name: 'Espacios',
                description: 'Espacios físicos y su ocupación.',
            },
            {
                name: 'Asignaciones de espacio',
                description:
                    'Asignaciones fijas o específicas de espacios a profesionales.',
            },
            {
                name: 'Tarifas de espacio',
                description: 'Tarifas por hora y vigencia de los espacios.',
            },
            {
                name: 'Estudios',
                description: 'Estudios médicos y sus archivos.',
            },
            {
                name: 'Autorizaciones de estudio',
                description:
                    'Autorizaciones de acceso a estudios por profesional.',
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
                Rol: {
                    type: 'string',
                    enum: ['PACIENTE', 'PROFESIONAL', 'ADMIN'],
                    example: 'PROFESIONAL',
                },
                Profesional: profesionalSchema,
                CrearProfesionalRequest: crearProfesionalSchema,
                ActualizarProfesionalRequest: actualizarProfesionalSchema,
                Espacio: espacioSchema,
                CrearEspacioRequest: crearEspacioSchema,
                ActualizarEspacioRequest: actualizarEspacioSchema,
                EspacioConAsignaciones: {
                    allOf: [
                        { $ref: '#/components/schemas/Espacio' },
                        {
                            type: 'object',
                            properties: {
                                asignaciones: {
                                    type: 'array',
                                    items: {
                                        $ref: '#/components/schemas/AsignacionEspacio',
                                    },
                                },
                            },
                        },
                    ],
                },
                OcupacionEspacioResponse: {
                    type: 'object',
                    required: ['data'],
                    properties: {
                        data: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/EspacioConAsignaciones',
                            },
                        },
                    },
                },
                AsignacionEspacio: asignacionEspacioSchema,
                CrearAsignacionEspacioRequest: crearAsignacionEspacioSchema,
                ActualizarAsignacionEspacioRequest:
                    actualizarAsignacionEspacioSchema,
                TarifaEspacio: tarifaEspacioSchema,
                CrearTarifaEspacioRequest: crearTarifaEspacioSchema,
                ActualizarTarifaEspacioRequest: actualizarTarifaEspacioSchema,
                Agenda: agendaSchema,
                CrearAgendaRequest: crearAgendaSchema,
                ActualizarAgendaRequest: actualizarAgendaSchema,
                DesactivarAgendaRequest: {
                    type: 'object',
                    properties: {
                        cancelarTurnosFuturos: {
                            type: 'boolean',
                            default: false,
                            description:
                                'Permite cancelar los turnos futuros de la agenda.',
                        },
                    },
                },
                Turno: turnoSchema,
                CrearTurnoRequest: crearTurnoSchema,
                ActualizarTurnoRequest: actualizarTurnoSchema,
                Estudio: estudioSchema,
                CrearEstudioRequest: crearEstudioSchema,
                AutorizacionEstudio: autorizacionEstudioSchema,
                CrearAutorizacionEstudioRequest: crearAutorizacionEstudioSchema,
                VigenciaAutorizacionResponse: {
                    type: 'object',
                    required: ['id', 'estaVigente', 'estaVencida'],
                    properties: {
                        id: idEntero,
                        estaVigente: { type: 'boolean', example: true },
                        estaVencida: { type: 'boolean', example: false },
                    },
                },
                UrlFirmadaResponse: {
                    type: 'object',
                    required: ['url', 'expiresIn'],
                    properties: {
                        url: {
                            type: 'string',
                            format: 'uri',
                            example:
                                'https://storage.example.com/archivo.pdf?token=...',
                        },
                        expiresIn: {
                            type: 'integer',
                            description: 'Segundos de validez de la URL.',
                            example: 3600,
                        },
                    },
                },
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
