/**
 * ============================================================
 *  BOT DE WHATSAPP — CLÍNICA MÉDICA
 *  Usa Baileys (ligero, sin Chrome)
 * ============================================================
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, isJidUser } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');

const { generarRespuesta } = require('./responder');
const { guardarPendiente } = require('./logger');
const { clinica, config } = require('./database');

// Memoria en caliente
const ultimoContacto = new Map();
const mensajesPendientes = new Map();
const DELAY_MS = 3000;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------
// Conexión
// ------------------------------------------------------------
async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'sesion'));

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    browser: ['Bot Clinica', 'Chrome', '4.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📲 Escanea este código QR desde WhatsApp:');
      console.log('   Ajustes → Dispositivos vinculados → Vincular un dispositivo\n');
    }

    if (connection === 'open') {
      console.log(`\n✅ Bot de *${clinica.nombre}* conectado y escuchando mensajes.\n`);
    }

    if (connection === 'close') {
      const razon = lastDisconnect?.error?.output?.statusCode;
      if (razon === DisconnectReason.loggedOut) {
        console.log('👋 Sesión cerrada. Ejecuta npm start y vuelve a escanear el QR.');
      } else {
        console.log('⚠️ Desconectado. Reconectando...');
        iniciarBot();
      }
    }
  });

  // ------------------------------------------------------------
  // Manejo de mensajes
  // ------------------------------------------------------------
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    if (!isJidUser(msg.key.remoteJid)) return;

    const chatId = msg.key.remoteJid;
    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

    console.log(`📩 Mensaje recibido de ${chatId}: "${texto}"`);

    // Agrupar mensajes (debounce)
    if (!mensajesPendientes.has(chatId)) {
      mensajesPendientes.set(chatId, []);
    }
    mensajesPendientes.get(chatId).push({ msg, texto });

    const existente = mensajesPendientes.get(chatId);
    if (existente._timeout) clearTimeout(existente._timeout);
    existente._timeout = setTimeout(() => procesarMensajes(sock, chatId), DELAY_MS);
  });
}

async function procesarMensajes(sock, chatId) {
  const mensajes = mensajesPendientes.get(chatId);
  mensajesPendientes.delete(chatId);
  if (!mensajes || !mensajes.length) return;

  const { msg, texto } = mensajes[mensajes.length - 1];
  const nombre = msg.pushName || 'Sin nombre';

  if (!texto.trim()) {
    const respuesta = '🙏 Gracias por escribirnos. Por aquí solo puedo leer mensajes de texto.\n\n' +
      '📝 Ya dejé tu mensaje registrado para que una persona del equipo lo revise.\n\n' +
      config.CIERRE;
    await sock.sendMessage(chatId, { text: respuesta });
    guardarPendiente(chatId, nombre, '[no-texto]');
    return;
  }

  const ultimo = ultimoContacto.get(chatId) || 0;
  const saludar = Date.now() - ultimo > config.MINUTOS_PARA_SALUDAR_DE_NUEVO * 60 * 1000;
  ultimoContacto.set(chatId, Date.now());

  const { texto: respuesta, resuelto } = generarRespuesta(texto, { saludar });
  await sock.sendMessage(chatId, { text: respuesta });

  console.log(`💬 ${nombre} (${chatId}): "${texto}"`);

  if (!resuelto) {
    guardarPendiente(chatId, nombre, texto);
    await notificarPersonal(sock, chatId, nombre, texto);
  }
}

async function notificarPersonal(sock, numeroPaciente, nombre, mensaje) {
  if (!config.NUMERO_PERSONAL) return;
  const destino = `${config.NUMERO_PERSONAL}@s.whatsapp.net`;
  const aviso =
    `🔔 *Consulta sin respuesta automática*\n\n` +
    `👤 ${nombre}\n` +
    `📞 wa.me/${numeroPaciente.replace('@s.whatsapp.net', '')}\n` +
    `💬 "${mensaje}"`;
  try {
    await sock.sendMessage(destino, { text: aviso });
  } catch (e) {
    console.error('⚠️ No se pudo avisar al personal:', e.message);
  }
}

iniciarBot();
