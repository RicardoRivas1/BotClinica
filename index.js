/**
 * BOT DE WHATSAPP — CLÍNICA MÉDICA (Baileys)
 */

require('./keep-alive');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const path = require('path');

const { generarRespuesta } = require('./responder');
const { guardarPendiente } = require('./logger');
const { clinica, config } = require('./database');

const ultimoContacto = new Map();
const mensajesPendientes = new Map();
const DELAY_MS = 3000;

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'sesion'));

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📲 Escanea este QR:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log(`\n✅ Bot de *${clinica.nombre}* conectado.\n`);
    }

    if (connection === 'close') {
      const razon = lastDisconnect?.error?.output?.statusCode;
      if (razon === DisconnectReason.loggedOut) {
        console.log('👋 Sesión cerrada. Vuelve a escanear el QR.');
      } else {
        console.log('⚠️ Reconectando...');
        setTimeout(iniciarBot, 3000);
      }
    }
  });

  sock.ev.on('messages.upsert', async (upsert) => {
    if (upsert.type !== 'notify') return;

    for (const msg of upsert.messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const chatId = msg.key.remoteJid;
      if (!chatId.endsWith('@s.whatsapp.net')) continue;

      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

      console.log(`📩 De ${chatId}: "${texto}"`);

      if (!texto.trim()) continue;

      // Debounce: agrupar mensajes
      if (!mensajesPendientes.has(chatId)) {
        mensajesPendientes.set(chatId, []);
      }
      mensajesPendientes.get(chatId).push({ msg, texto });

      const existente = mensajesPendientes.get(chatId);
      if (existente._timeout) clearTimeout(existente._timeout);
      existente._timeout = setTimeout(() => procesarMensajes(sock, chatId), DELAY_MS);
    }
  });
}

async function procesarMensajes(sock, chatId) {
  try {
    const mensajes = mensajesPendientes.get(chatId);
    mensajesPendientes.delete(chatId);
    if (!mensajes || !mensajes.length) return;

    const { msg, texto } = mensajes[mensajes.length - 1];
    const nombre = msg.pushName || 'Sin nombre';

    const ultimo = ultimoContacto.get(chatId) || 0;
    const saludar = Date.now() - ultimo > config.MINUTOS_PARA_SALUDAR_DE_NUEVO * 60 * 1000;
    ultimoContacto.set(chatId, Date.now());

    const { texto: respuesta, resuelto } = generarRespuesta(texto, { saludar });

    console.log(`📤 Respondiendo: "${respuesta.substring(0, 60)}..."`);
    await sock.sendMessage(chatId, { text: respuesta });

    if (!resuelto) {
      guardarPendiente(chatId, nombre, texto);
      await notificarPersonal(sock, chatId, nombre, texto);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function notificarPersonal(sock, numeroPaciente, nombre, mensaje) {
  if (!config.NUMERO_PERSONAL) return;
  const destino = `${config.NUMERO_PERSONAL}@s.whatsapp.net`;
  const aviso =
    `🔔 *Consulta sin respuesta*\n\n👤 ${nombre}\n📞 wa.me/${numeroPaciente.replace('@s.whatsapp.net', '')}\n💬 "${mensaje}"`;
  try {
    await sock.sendMessage(destino, { text: aviso });
  } catch (e) {
    console.error('⚠️ Error al avisar al personal:', e.message);
  }
}

iniciarBot();
