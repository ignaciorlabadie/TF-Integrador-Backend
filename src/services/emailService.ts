import { AppError } from '../errors/AppError.js'

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

export async function enviarEmailRecuperacion(
    email: string,
    url: string,
): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY
    const remitente = process.env.EMAIL_FROM
    const nombreRemitente = process.env.EMAIL_FROM_NAME || 'Sistema de Turnos'

    if (!apiKey || !remitente) {
        throw new AppError(500, 'La configuración de email no está completa')
    }

    const texto = [
        'Recibimos un pedido para restablecer tu contraseña.',
        '',
        `Ingresá al siguiente enlace para elegir una nueva contraseña:`,
        url,
        '',
        'Si no solicitaste este cambio, podés ignorar este mensaje.',
    ].join('\n')

    const html = `
        <p>Recibimos un pedido para restablecer tu contraseña.</p>
        <p>
            <a href="${url}">Hacé clic acá para elegir una nueva contraseña</a>
        </p>
        <p>Si no solicitaste este cambio, podés ignorar este mensaje.</p>
    `.trim()

    const respuesta = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            sender: {
                name: nombreRemitente,
                email: remitente,
            },
            to: [{ email }],
            subject: 'Recuperación de contraseña',
            htmlContent: html,
            textContent: texto,
        }),
    })

    if (!respuesta.ok) {
        throw new AppError(502, 'No se pudo enviar el email de recuperación')
    }
}

export async function enviarEmailTurnoCreado(
    email: string,
    nombre: string,
    fecha: string,
    hora: string,
    profesional: string,
): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY
    const remitente = process.env.EMAIL_FROM
    const nombreRemitente = process.env.EMAIL_FROM_NAME || 'Sistema de Turnos'

    if (!apiKey || !remitente) {
        throw new AppError(500, 'La configuración de email no está completa')
    }

    const texto = [
        `Hola ${nombre},`,
        '',
        'Se ha creado un turno con los siguientes datos:',
        `Fecha: ${fecha}`,
        `Hora: ${hora}`,
        `Profesional: ${profesional}`,
        '',
        'Gracias por confiar en nuestro sistema.',
    ].join('\n')

    const html = `
        <p>Hola ${nombre},</p>
        <p>Se ha creado un turno con los siguientes datos:</p>
        <ul>
            <li><strong>Fecha:</strong> ${fecha}</li>
            <li><strong>Hora:</strong> ${hora}</li>
            <li><strong>Profesional:</strong> ${profesional}</li>
        </ul>
        <p>Gracias por confiar en nuestro sistema.</p>
    `.trim()

    const respuesta = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            sender: {
                name: nombreRemitente,
                email: remitente,
            },
            to: [{ email }],
            subject: 'Turno creado',
            htmlContent: html,
            textContent: texto,
        }),
    })

    if (!respuesta.ok) {
        throw new AppError(502, 'No se pudo enviar el email de turno creado')
    }
}

export async function enviarEmailTurnoCancelado(
    email: string,
    nombre: string,
    fecha: string,
    hora: string,
    profesional: string,
): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY
    const remitente = process.env.EMAIL_FROM
    const nombreRemitente = process.env.EMAIL_FROM_NAME || 'Sistema de Turnos'

    if (!apiKey || !remitente) {
        throw new AppError(500, 'La configuración de email no está completa')
    }

    const texto = [
        `Hola ${nombre},`,
        '',
        'Se ha cancelado un turno con los siguientes datos:',
        `Fecha: ${fecha}`,
        `Hora: ${hora}`,
        `Profesional: ${profesional}`,
        '',
        'Si tenés dudas, contactanos.',
    ].join('\n')

    const html = `
        <p>Hola ${nombre},</p>
        <p>Se ha cancelado un turno con los siguientes datos:</p>
        <ul>
            <li><strong>Fecha:</strong> ${fecha}</li>
            <li><strong>Hora:</strong> ${hora}</li>
            <li><strong>Profesional:</strong> ${profesional}</li>
        </ul>
        <p>Si tenés dudas, contactanos.</p>
    `.trim()

    const respuesta = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            sender: {
                name: nombreRemitente,
                email: remitente,
            },
            to: [{ email }],
            subject: 'Turno cancelado',
            htmlContent: html,
            textContent: texto,
        }),
    })

    if (!respuesta.ok) {
        throw new AppError(502, 'No se pudo enviar el email de turno cancelado')
    }
}
