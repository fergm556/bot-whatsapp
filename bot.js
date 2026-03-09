const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

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
    }
});

// QR
client.on('qr', (qr) => {
    console.log('Escanea el QR con WhatsApp');
    qrcode.generate(qr, { small: true });
});

// Bot listo
client.on('ready', () => {
    console.log('Bot conectado correctamente');
});

// Comandos
client.on('message', async msg => {

    const text = msg.body.toLowerCase();

    if (text === '!help') {

        msg.reply(`📜 COMANDOS

!help
.pago
.stock
`);

    }

    if (text === '.pago') {

        msg.reply(`💳 MÉTODOS DE PAGO

Spin by Oxxo
42174700084077805

Después de pagar manda tu comprobante`);

    }

    if (text === '.stock') {

        msg.reply(`📦 CATÁLOGO

Netflix Perfil $60
Disney Perfil $20
Crunchyroll Perfil $20
Prime Perfil $15`);

    }

});

client.initialize();
