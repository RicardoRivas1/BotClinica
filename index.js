const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');

const { generarRespuesta } = require('./responder');
const { guardarPendiente } = require('./logger');
const { clinica, config } = require('./database');

let qrImagen = null;

const app = express();
app.get('/', (req, res) => {
  if (qrImagen) {
    res.send(`<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#111;flex-direction:column;font-family:sans-serif;color:white"><h2>Escanea el QR con WhatsApp</h2><img src="${qrImagen}" style="width:350px;border-radius:10px"><p>Ajustes > Dispositivos vinculados > Vincular dispositivo</p></body></html>`);
  } else {
    res.send('Bot activo - Esperando conexion...');
  }
});
app.listen(process.env.PORT || 3000, () => console.log(`🌐 Abre la URL en el navegador para ver el QR`));

const ultimoContacto = new Map();
const mensajesPendientes = new Map();

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'sesion'));

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Clinica Bot', 'Safari', '3.0'],
    markOnlineOnConnect: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      qrImagen = await QRCode.toDataURL(qr, { width: 400, margin: 2 });
      console.log('📲 QR generado - Abre la URL en tu navegador para escanearlo');
    }
    if (connection === 'open') {
      qrImagen = null;
      console.log(`✅ Bot de *${clinica.nombre}* conectado.`);
    }
    if (connection === 'close') {
      qrImagen = null;
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        console.log('⚠️ Reconectando...');
        setTimeout(iniciarBot, 3000);
      } else {
        console.log('👋 Sesión cerrada.');
        process.exit(0);
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
    console.log(`⚙️ Procesando mensaje de ${nombre}: "${texto}"`);

    const ultimo = ultimoContacto.get(chatId) || 0;
    const saludar = Date.now() - ultimo > config.MINUTOS_PARA_SALUDAR_DE_NUEVO * 60 * 1000;
    ultimoContacto.set(chatId, Date.now());

    const { texto: respuesta, resuelto } = generarRespuesta(texto, { saludar });
    console.log(`📤 Enviando respuesta a ${chatId}`);
    await sock.sendMessage(chatId, { text: respuesta });
    console.log(`✅ Respuesta enviada`);

    if (!resuelto) guardarPendiente(chatId, nombre, texto);
  } catch (e) {
    console.error('❌ Error en procesar:', e.message, e.stack);
  }
}

console.log('🚀 Iniciando bot...');
iniciarBot();
