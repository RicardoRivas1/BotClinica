const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, isJidUser } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const path = require('path');

const { generarRespuesta } = require('./responder');
const { guardarPendiente } = require('./logger');
const { clinica, config } = require('./database');

const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () => console.log(`🌐 Puerto ${process.env.PORT || 3000}`));

const ultimoContacto = new Map();
const mensajesPendientes = new Map();

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'sesion'));

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'fatal' }),
    browser: ['Clinica Bot', 'Safari', '3.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\n📲 ESCANEA ESTE QR:\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log(`✅ Bot de *${clinica.nombre}* conectado.`);
    }
    if (connection === 'close') {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        console.log('⚠️ Reconectando...');
        setTimeout(iniciarBot, 3000);
      } else {
        console.log('👋 Sesión cerrada.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const chatId = msg.key.remoteJid;
      if (!chatId.endsWith('@s.whatsapp.net')) continue;

      const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      console.log(`📩 De ${chatId}: "${texto}"`);

      if (!texto.trim()) continue;

      if (!mensajesPendientes.has(chatId)) mensajesPendientes.set(chatId, []);
      mensajesPendientes.get(chatId).push({ msg, texto });

      const existente = mensajesPendientes.get(chatId);
      if (existente._timeout) clearTimeout(existente._timeout);
      existente._timeout = setTimeout(() => procesar(sock, chatId), 3000);
    }
  });
}

async function procesar(sock, chatId) {
  try {
    const mensajes = mensajesPendientes.get(chatId);
    mensajesPendientes.delete(chatId);
    if (!mensajes?.length) return;

    const { msg, texto } = mensajes[mensajes.length - 1];
    const nombre = msg.pushName || 'Sin nombre';

    const ultimo = ultimoContacto.get(chatId) || 0;
    const saludar = Date.now() - ultimo > config.MINUTOS_PARA_SALUDAR_DE_NUEVO * 60 * 1000;
    ultimoContacto.set(chatId, Date.now());

    const { texto: respuesta, resuelto } = generarRespuesta(texto, { saludar });
    console.log(`📤 Respondiendo a ${nombre}`);
    await sock.sendMessage(chatId, { text: respuesta });

    if (!resuelto) guardarPendiente(chatId, nombre, texto);
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

iniciarBot();
