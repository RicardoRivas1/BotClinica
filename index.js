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

// Servidor HTTP para mantener Render activo
const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
app.listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Puerto ${process.env.PORT || 3000}`);
});

// Borrar sesión anterior para forzar QR nuevo
const sesionPath = path.join(__dirname, 'sesion');
if (fs.existsSync(sesionPath)) {
  fs.rmSync(sesionPath, { recursive: true, force: true });
  console.log('🗑️ Sesión anterior borrada');
}

// Cliente de WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './sesion' }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
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

client.on('authenticated', () => {
  console.log('🔐 Autenticado');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Error de auth:', msg);
});

client.on('ready', () => {
  console.log(`\n✅ Bot de *${clinica.nombre}* conectado.\n`);
});

client.on('disconnected', () => {
  console.log('⚠️ Desconectado. Reconectando...');
  client.initialize();
});

client.on('message', async (msg) => {
  try {
    if (msg.from === 'status@broadcast') return;
    if (config.IGNORAR_GRUPOS && msg.from.endsWith('@g.us')) return;

    console.log(`📩 De ${msg.from}: "${msg.body}"`);

    if (!mensajesPendientes.has(msg.from)) {
      mensajesPendientes.set(msg.from, []);
    }
    mensajesPendientes.get(msg.from).push(msg);

    const existente = mensajesPendientes.get(msg.from);
    if (existente._timeout) clearTimeout(existente._timeout);
    existente._timeout = setTimeout(() => procesarMensajes(msg.from), DELAY_MS);
  } catch (error) {
    console.error('❌ Error:', error);
  }
});

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
    await msg.reply(texto);

    console.log(`💬 ${nombre}: "${msg.body}"`);

    if (!resuelto) {
      guardarPendiente(chatId, nombre, msg.body);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

console.log('⏳ Conectando a WhatsApp...');
client.initialize();
