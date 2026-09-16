/**
 * BOT DE WHATSAPP — CLÍNICA MÉDICA
 */

const express = require('express');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

const { generarRespuesta } = require('./responder');
const { guardarPendiente } = require('./logger');
const { clinica, config } = require('./database');

const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Puerto ${process.env.PORT || 3000}`);
});

const sesionPath = path.join(__dirname, 'sesion');
if (fs.existsSync(sesionPath)) {
  fs.rmSync(sesionPath, { recursive: true, force: true });
  console.log('🗑️ Sesión anterior borrada');
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './sesion' }),
  webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/nicepkg/nice-dev/main/nice-dev/whatsapp-web.js/nice-dev/whatsapp-web.js/versions.json' },
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
    ],
    timeout: 60000,
  },
});

const ultimoContacto = new Map();
const mensajesPendientes = new Map();
const DELAY_MS = 3000;

console.log('🚀 Iniciando bot...');

client.on('qr', (qr) => {
  console.log('\n📲 ESCANEA ESTE QR:\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => console.log('🔐 Autenticado'));

client.on('auth_failure', (msg) => console.error('❌ Auth falló:', msg));

client.on('ready', () => {
  console.log(`\n✅ Bot de *${clinica.nombre}* conectado.\n`);
});

client.on('disconnected', (razon) => {
  console.log('⚠️ Desconectado:', razon);
});

// Escuchar TODOS los eventos para debug
client.on('message', async (msg) => {
  console.log(`📩 MESSAGE EVENT: from=${msg.from} type=${msg.type} body=${msg.body}`);
  await manejarMensaje(msg);
});

client.on('message_create', async (msg) => {
  if (msg.fromMe) {
    console.log(`📤 MESSAGE_CREATE: to=${msg.to} body=${msg.body}`);
  }
});

async function manejarMensaje(msg) {
  try {
    if (msg.from === 'status@broadcast') return;
    if (config.IGNORAR_GRUPOS && msg.from.endsWith('@g.us')) return;

    if (!mensajesPendientes.has(msg.from)) {
      mensajesPendientes.set(msg.from, []);
    }
    mensajesPendientes.get(msg.from).push(msg);

    const existente = mensajesPendientes.get(msg.from);
    if (existente._timeout) clearTimeout(existente._timeout);
    existente._timeout = setTimeout(() => procesarMensajes(msg.from), DELAY_MS);
  } catch (error) {
    console.error('❌ Error message:', error);
  }
}

async function procesarMensajes(chatId) {
  try {
    const mensajes = mensajesPendientes.get(chatId);
    mensajesPendientes.delete(chatId);
    if (!mensajes || !mensajes.length) return;

    const msg = mensajes[mensajes.length - 1];
    const contacto = await msg.getContact();
    const nombre = contacto?.pushname || contacto?.name || 'Sin nombre';

    if (msg.type !== 'chat' || !msg.body?.trim()) {
      await msg.reply(
        '🙏 Solo puedo leer mensajes de texto.\n\n' +
        '📝 Tu mensaje fue registrado.\n\n' + config.CIERRE
      );
      guardarPendiente(chatId, nombre, `[${msg.type}]`);
      return;
    }

    const ultimo = ultimoContacto.get(chatId) || 0;
    const saludar = Date.now() - ultimo > config.MINUTOS_PARA_SALUDAR_DE_NUEVO * 60 * 1000;
    ultimoContacto.set(chatId, Date.now());

    const { texto, resuelto } = generarRespuesta(msg.body, { saludar });
    console.log(`📤 Respondiendo a ${chatId}: "${texto.substring(0, 50)}..."`);
    await msg.reply(texto);

    console.log(`💬 ${nombre}: "${msg.body}"`);

    if (!resuelto) {
      guardarPendiente(chatId, nombre, msg.body);
    }
  } catch (error) {
    console.error('❌ Error procesar:', error);
  }
}

console.log('⏳ Conectando...');
client.initialize();
