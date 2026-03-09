const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Crear cliente (configuración única y correcta)
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "fer-bot"
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process',
      '--no-zygote'
    ]
    // Si alguna vez necesitas un ejecutable Chromium personalizado:
    // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  }
});

// Encuestas activas
const activePolls = new Map();

function normalizeLetter(s) {
  const t = (s || '').trim().toUpperCase();
  return /^[A-Z]$/.test(t) ? t : null;
}

function parsePollCommand(text) {
  const rest = text.slice('!poll'.length).trim();
  const parts = rest.split('|').map(x => x.trim()).filter(Boolean);

  if (parts.length < 3) return null;

  const question = parts[0].replace(/^"(.+)"$/, '$1');
  const options = parts.slice(1);

  return { question, options };
}

// QR
client.on('qr', (qr) => {
  console.log('📱 Escanea el QR en WhatsApp > Dispositivos vinculados');
  qrcode.generate(qr, { small: true });
});

// Bot listo
client.on('ready', () => {
  console.log('✅ Bot conectado y listo.');
});

// Bienvenida
client.on('group_join', async (notification) => {
  try {
    const chat = await notification.getChat();
    const contact = await notification.getContact();

    await chat.sendMessage(
      '👋 Bienvenido @' + contact.number,
      { mentions: [contact] }
    );

  } catch (e) {
    console.log(e);
  }
});

// Despedida
client.on('group_leave', async (notification) => {
  try {
    const chat = await notification.getChat();
    const contact = await notification.getContact();

    await chat.sendMessage(
      '👋 Se fue @' + contact.number,
      { mentions: [contact] }
    );

  } catch (e) {
    console.log(e);
  }
});

// Mensajes
client.on('message_create', async (msg) => {

  try {

    if (msg.fromMe) return;

    // Solo grupos
    if (!msg.from.endsWith('@g.us')) return;

    const chatId = msg.from;
    const text = (msg.body || '').trim();
    const lower = text.toLowerCase();

    // HELP
    if (text === '!help') {

      await msg.reply(
`*📜 COMANDOS DEL BOT*

!help
.pago
.stock

*Encuestas*
!poll "Pregunta" | opcion1 | opcion2 | opcion3
!poll close

*Para votar envía:* A B C`
      );

      return;
    }

    // PAGOS
    if (lower === '.pago') {

      await msg.reply(
`*💳 MÉTODOS DE PAGO – FER SHOP*

Spin by Oxxo
42174700084077805

Después de pagar manda tu comprobante.

⏱ Entrega: 15 a 50 minutos`
      );

      return;
    }

    // STOCK
    if (lower === '.stock') {

      await msg.reply(
`*📦 CATÁLOGO*

Netflix
Perfil: $60
Privado: $70

Disney
Completa: $70
Perfil: $20

Crunchyroll
Completa: $60
Perfil: $20

Max
Completa: $60
Perfil: $15

Prime
Completa: $25
Perfil: $15

YouTube Premium
Invitación: $30
Familia: $70`
      );

      return;
    }

    // Cerrar encuesta
    if (lower === '!poll close') {

      const poll = activePolls.get(chatId);

      if (!poll) {
        await msg.reply('❌ No hay encuesta activa.');
        return;
      }

      const counts = {};

      for (const letter of poll.letters) counts[letter] = 0;

      for (const [, letter] of poll.votes.entries()) {
        if (counts[letter] !== undefined) counts[letter] += 1;
      }

      const lines = poll.options.map((op, i) => {
        const letter = poll.letters[i];
        return `${letter}. ${op} — ${counts[letter] || 0} votos`;
      });

      activePolls.delete(chatId);

      await msg.reply(
`📊 RESULTADOS

${poll.question}

${lines.join('\n')}`
      );

      return;
    }

    // Crear encuesta
    if (lower.startsWith('!poll')) {

      const parsed = parsePollCommand(text);

      if (!parsed) {
        await msg.reply('Uso: !poll "Pregunta" | opcion1 | opcion2 | opcion3');
        return;
      }

      if (activePolls.has(chatId)) {
        await msg.reply('⚠️ Ya hay una encuesta activa.');
        return;
      }

      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        .slice(0, parsed.options.length)
        .split('');

      activePolls.set(chatId, {
        question: parsed.question,
        options: parsed.options,
        letters,
        votes: new Map()
      });

      const pollText =
`📊 *ENCUESTA*

${parsed.question}

${parsed.options.map((op,i)=>`${letters[i]}. ${op}`).join('\n')}

Vota enviando: ${letters.join(', ')}
Cerrar con: !poll close`;

      await msg.reply(pollText);

      return;
    }

    // Registrar voto
    const poll = activePolls.get(chatId);
    if (!poll) return;

    const letter = normalizeLetter(text);
    if (!letter) return;

    if (!poll.letters.includes(letter)) return;

    const voterId = msg.author || msg.from;

    poll.votes.set(voterId, letter);

    await msg.react('✅');

  } catch (err) {

    console.log("Error:", err);

  }

});

// Iniciar bot
client.initialize();

// Mantener terminal abierta si lo ejecutas localmente (opcional)
process.stdin.resume();

