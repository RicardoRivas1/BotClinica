const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot activo');
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Servidor HTTP en puerto ${process.env.PORT || 3000}`);
});

// Keep-alive: hacer ping cada 4 minutos para no dormir
setInterval(() => {
  console.log(`💓 Keep-alive ${new Date().toLocaleTimeString()}`);
}, 4 * 60 * 1000);
