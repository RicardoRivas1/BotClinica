# 🏥 Bot de WhatsApp — Clínica Médica

Asistente virtual que responde precios, doctores y ubicaciones por WhatsApp.
Se vincula **escaneando un código QR**, igual que WhatsApp Web.

---

## 1. Requisitos

- **Node.js 18 o superior** → https://nodejs.org (instala la versión LTS)
- Un número de WhatsApp para el bot (idealmente **uno dedicado**, no el personal)
- Conexión a internet estable

Verifica que Node quedó instalado:

```bash
node --version
```

---

## 2. Instalación

Abre una terminal dentro de la carpeta del proyecto y ejecuta:

```bash
npm install
```

> Esto descarga `whatsapp-web.js` y un navegador Chromium (pesa ~200 MB, es normal que tarde la primera vez).

---

## 3. Configura tu clínica

Abre **`database.js`** y edita:

- `clinica` → nombre, horario, dirección, teléfono
- `TELEFONO_RADIOLOGIA` → teléfono que se da para agendar los estudios de imágenes
- `especialidades` → cada doctor con consultorio, precio y teléfono
- `servicios` → otros servicios que quieras ofrecer (análisis, consultas, etc.)
- `config.NUMERO_PERSONAL` → número que recibirá las consultas que el bot no sepa responder
  (formato `584141234567`, sin `+`, sin espacios ni guiones)

Hay **plantillas comentadas** listas para copiar y pegar.

### 3.1. Precios de radiología

Los estudios de imágenes (rayos X, ecos, tomografías, mamografías, densitometrías, etc.)
**no se escriben a mano**: viven en **`estudios.js`**, que se generó desde el Excel
`LISTADO Precios RADIOLOGIA.xlsx` (pestaña `01-11-22`, precios en dólares).

Para actualizar los precios cuando cambie la tabla de precios:

1. Reemplaza el Excel en la carpeta del proyecto (la hoja más reciente es la que se usa).
2. Vuelve a generar `estudios.js` y reinicia el bot.

El bot entiende las palabras que usan los pacientes: si escriben *"placa de la columna
cervical"*, *"un eco de mama"* o *"tac de cráneo"* encuentra el estudio aunque en el
Excel se llame *"Columna Cervical 2 Proyecciones"*, *"Eco Mamario"* o *"Tac Cráneo"*.

---

## 4. Enciende el bot y escanea el QR

```bash
npm start
```

En la terminal aparecerá el código QR. En el teléfono del bot:

**WhatsApp → Ajustes → Dispositivos vinculados → Vincular un dispositivo → escanear**

Cuando veas `✅ Bot conectado y escuchando mensajes`, ya está funcionando.

> La sesión queda guardada en la carpeta `sesion/`, así que **no tendrás que escanear el QR cada vez**.
> Para forzar un QR nuevo: `npm run reset`.

⚠️ La computadora debe permanecer encendida y con el proceso abierto para que el bot responda.

---

## 5. Qué hace el bot

| Situación | Respuesta |
|---|---|
| "Hola" | Saludo + resumen de estudios y especialidades |
| "¿Cuánto cuesta un ECO abdominal?" | Precio + nota de preparación + teléfono para agendar |
| "¿Cuánto cuesta una radiografía de rodilla?" | Las opciones de rayos X de rodilla con su precio |
| "Dime los precios de los rayos X" | Resumen de la categoría: desde $15 y cuántos hay |
| "¿Cuánto cuesta un ECO y qué doctor hay de Cardiología?" | **Ambas respuestas en un solo mensaje**, separadas |
| "¿Hacen resonancia?" (no está en la base) | Mensaje amable + queda registrado para el personal |
| Audio, foto o documento | Avisa que solo lee texto y lo deriva al personal |
| Un humano responde manualmente | El bot se calla **30 min** en ese chat (configurable) |

Todo mensaje termina preguntando: *"¿Puedo ayudarte con algo más? 😊"*

---

## 6. Consultas pendientes

Las preguntas que el bot no supo responder se guardan en:

```
data/pendientes.json
```

Con fecha, nombre, número y el mensaje original. Si configuraste `NUMERO_PERSONAL`,
además llega un aviso por WhatsApp con un enlace `wa.me/` para responder con un clic.

---

## 7. Notas importantes

- `whatsapp-web.js` es una librería **no oficial**: automatiza WhatsApp Web. Para uso
  moderado y legítimo funciona bien, pero WhatsApp podría restringir números que envíen
  mensajes masivos o no solicitados. **Usa un número dedicado** y responde solo a quien escribe primero.
- Para un despliegue comercial a gran escala, la vía oficial es la **WhatsApp Cloud API**
  (de Meta), que no usa QR sino tokens y plantillas aprobadas.
- No borres la carpeta `sesion/` salvo que quieras vincular otro número.

---

## 8. Problemas frecuentes

| Problema | Solución |
|---|---|
| El QR no se ve bien | Amplía la ventana de la terminal o reduce el zoom |
| `Failed to launch the browser` | En Linux: `sudo apt install -y chromium-browser libnss3 libatk-bridge2.0-0 libgbm1 libasound2` |
| Se queda en "Cargando 99%" | Cierra con Ctrl+C, ejecuta `npm run reset` y vuelve a escanear |
| El bot no responde | Revisa que el chat no esté en pausa por respuesta humana (30 min) |
| Dejó de funcionar tras una actualización de WhatsApp | `npm update whatsapp-web.js` |
