import { AppError } from '../errors/AppError.js'
import { obtenerUrlFrontend } from '../utils/frontendUrl.js'

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

type PayloadEmail = {
    to: string
    subject: string
    htmlContent: string
    textContent: string
}

async function enviarConBrevo({
    to,
    subject,
    htmlContent,
    textContent,
}: PayloadEmail): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY
    const remitente = process.env.EMAIL_FROM
    const nombreRemitente = process.env.EMAIL_FROM_NAME || 'Sistema de Turnos'

    if (!apiKey || !remitente) {
        throw new AppError(500, 'La configuración de email no está completa')
    }

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
            to: [{ email: to }],
            subject,
            htmlContent,
            textContent,
        }),
    })

    if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => '')
        const mensaje = `Brevo respondió ${respuesta.status}${detalle ? `: ${detalle}` : ''}`

        console.error('No se pudo enviar el email:', mensaje)

        throw new AppError(502, mensaje)
    }
}

export async function enviarEmailRecuperacion(
    email: string,
    url: string,
): Promise<void> {
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

    await enviarConBrevo({
        to: email,
        subject: 'Recuperación de contraseña',
        htmlContent: html,
        textContent: texto,
    })
}

export async function enviarEmailBienvenida(
    email: string,
    nombre?: string,
): Promise<void> {
    const url = `${obtenerUrlFrontend()}/login`
    const saludo = nombre ? `Hola ${nombre},` : 'Hola,'

    const texto = [
        saludo,
        '',
        'Te damos la bienvenida al Trabajo Final Integrador.',
        '',
        'Ya podés ingresar a tu cuenta:',
        url,
    ].join('\n')

    const html = `
        <p>${saludo}</p>
        <p>Te damos la bienvenida al <strong>Trabajo Final Integrador</strong>.</p>
        <p>
            <a href="${url}">Ingresá a tu cuenta</a>
        </p>
    `.trim()

    await enviarConBrevo({
        to: email,
        subject: 'Bienvenido al Trabajo Final Integrador',
        htmlContent: html,
        textContent: texto,
    })
}

export async function enviarEmailTurnoCreado(
    email: string,
    nombre: string,
    fecha: string,
    hora: string,
    profesional: string,
): Promise<void> {
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

    await enviarConBrevo({
        to: email,
        subject: 'Turno creado',
        htmlContent: html,
        textContent: texto,
    })
}

export async function enviarEmailTurnoCancelado(
    email: string,
    nombre: string,
    fecha: string,
    hora: string,
    profesional: string,
): Promise<void> {
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

    await enviarConBrevo({
        to: email,
        subject: 'Turno cancelado',
        htmlContent: html,
        textContent: texto,
    })
}
