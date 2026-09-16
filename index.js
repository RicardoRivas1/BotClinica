/**
 * ============================================================
 *  BOT DE WHATSAPP — CLÍNICA MÉDICA
 *  Vinculación por código QR (WhatsApp Web)
 *
 *  Ejecutar:  npm start
 *  Luego:     WhatsApp > Ajustes > Dispositivos vinculados > Vincular dispositivo
 * ============================================================
 */

const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const { generarRespuesta } = require('./responder');
const { guardarPendiente } = require('./logger');
const { clinica, config } = require('./database');

// ------------------------------------------------------------
// Cliente de WhatsApp
// ------------------------------------------------------------
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './sesion' }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  },
});

// Memoria en caliente
const enviadosPorBot = new Set(); // ids de mensajes que envió el bot
const ultimoContacto = new Map(); // chatId -> timestamp del último mensaje atendido

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------
// Eventos de conexión
// ------------------------------------------------------------
client.on('qr', async (qr) => {
  console.log('\n📲 Escanea este código QR desde WhatsApp:');
  console.log('   Ajustes → Dispositivos vinculados → Vincular un dispositivo\n');
  qrcode.generate(qr, { small: true });

  // Guardar QR como imagen PNG para escanear cómodamente
  const rutaQR = require('path').join(__dirname, 'qr-vinculacion.png');
  await QRCode.toFile(rutaQR, qr, { width: 400, margin: 2 });
  console.log(`   📷 QR guardado como imagen: qr-vinculacion.png\n`);
});

client.on('authenticated', () => console.log('🔐 Sesión autenticada correctamente.'));
client.on('auth_failure', (msg) => console.error('❌ Falló la autenticación:', msg));
client.on('loading_screen', (p) => console.log(`⏳ Cargando WhatsApp... ${p}%`));

client.on('ready', () => {
  console.log(`\n✅ Bot de *${clinica.nombre}* conectado y escuchando mensajes.`);
  console.log('   (Deja esta ventana abierta. Ctrl + C para detenerlo.)\n');
});

client.on('disconnected', (razon) => {
  console.warn('⚠️ Bot desconectado:', razon);
});

// ------------------------------------------------------------
// Manejo de mensajes entrantes
// ------------------------------------------------------------
client.on('message', async (msg) => {
  try {
    // Filtros básicos
    if (msg.from === 'status@broadcast') return;
    if (config.IGNORAR_GRUPOS && msg.from.endsWith('@g.us')) return;

    const contacto = await msg.getContact();
    const nombre = contacto?.pushname || contacto?.name || 'Sin nombre';

    // Mensajes que no son texto (audio, imagen, documento...)
    if (msg.type !== 'chat' || !msg.body?.trim()) {
      guardarPendiente(msg.from, nombre, `[${msg.type}] contenido no textual`);
      await responder(
        msg,
        '🙏 Gracias por escribirnos. Por aquí solo puedo leer mensajes de texto.\n\n' +
          '📝 Ya dejé tu mensaje registrado para que una persona del equipo lo revise.\n\n' +
          config.CIERRE
      );
      await notificarPersonal(msg.from, nombre, `[${msg.type}]`);
      return;
    }

    // ¿Toca saludar? (primer contacto o tras mucho tiempo sin hablar)
    const ultimo = ultimoContacto.get(msg.from) || 0;
    const saludar = Date.now() - ultimo > config.MINUTOS_PARA_SALUDAR_DE_NUEVO * 60 * 1000;
    ultimoContacto.set(msg.from, Date.now());

    const { texto, resuelto } = generarRespuesta(msg.body, { saludar });
    await responder(msg, texto);

    console.log(`💬 ${nombre} (${msg.from.replace('@c.us', '')}): "${msg.body}"`);

    if (!resuelto) {
      guardarPendiente(msg.from, nombre, msg.body);
      await notificarPersonal(msg.from, nombre, msg.body);
    }
  } catch (error) {
    console.error('❌ Error procesando el mensaje:', error);
  }
});

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------
async function responder(msg, texto) {
  const enviado = await msg.reply(texto);
  if (enviado?.id?._serialized) enviadosPorBot.add(enviado.id._serialized);
  return enviado;
}

async function notificarPersonal(numeroPaciente, nombre, mensaje) {
  if (!config.NUMERO_PERSONAL) return;
  const destino = `${config.NUMERO_PERSONAL}@c.us`;
  const aviso =
    `🔔 *Consulta sin respuesta automática*\n\n` +
    `👤 ${nombre}\n` +
    `📞 wa.me/${numeroPaciente.replace('@c.us', '')}\n` +
    `💬 "${mensaje}"`;
  try {
    const enviado = await client.sendMessage(destino, aviso);
    if (enviado?.id?._serialized) enviadosPorBot.add(enviado.id._serialized);
  } catch (e) {
    console.error('⚠️ No se pudo avisar al personal:', e.message);
  }
}

// Cierre ordenado
process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando el bot...');
  try {
    await client.destroy();
  } catch {}
  process.exit(0);
});

client.initialize();
