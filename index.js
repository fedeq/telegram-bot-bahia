const express = require('express')
const bodyParser = require('body-parser');
require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const https = require('https')
const token = process.env.BOT_TOKEN;
let bot;

if (process.env.NODE_ENV === 'production') {
    bot = new TelegramBot(token);
    bot.setWebHook(process.env.HEROKU_URL + bot.token);
} else {
    bot = new TelegramBot(token, { polling: true });
}

const makeRequest = (host, path) => new Promise((resolve, reject) => {
    var options = {
        host: host,
        path: path,
        method: 'GET'
    };

    const req = https.request(options, res => {
        let data = ""

        res.on("data", d => {
            data += d
        })
        res.on("end", () => {
            resolve(data)
        })

    })

    req.on('error', error => {
        reject(error);
    })

    req.end()
});

const capitalize = (str) => `${str[0].toUpperCase()}${str.slice(1)}`;

bot.on('message', (msg) => {

    const chatId = msg.chat.id;
    switch (msg.text.toLocaleLowerCase()) {
        case "/casos":
        case "/covid": {
            makeRequest(process.env.HOST_COVID, process.env.PATH_COVID_CASOS).then(data => {
                data = JSON.parse(data);
                const str = data.map(elem => {
                    return `*${capitalize(elem.key)}*: ${elem.values[0].y}`
                });
                const nuevos_casos = data.filter(d => d["key"] == "nuevos casos").map(c => c.values);
                const fecha_nuevos_casos = nuevos_casos[0][0].x;
                bot.sendMessage(chatId, `${fecha_nuevos_casos}\n${str.join('\n')}`, { parse_mode: "Markdown" });
            }).catch(e => {
                console.log(e);
            });
        }
            break;
        case "/hola": {
            bot.sendMessage(chatId, `Hola ${msg.from.first_name}`, { parse_mode: "Markdown" });
        }
            break;
        case "/matebot": {
            bot.sendMessage(chatId, `Mi hermano no está`, { parse_mode: "Markdown" });
        }
            break;
        case "/camas": {
            makeRequest(process.env.HOST_COVID, process.env.PATH_COVID_CAMAS).then(data => {
                data = JSON.parse(data);
                let str = '';
                for (let prop in data) {
                    str += `*${capitalize(prop)}*: ${data[prop]}%\n`;
                }
                bot.sendMessage(chatId, `${str}`, { parse_mode: "Markdown" });
            }).catch(e => {
                console.log(e);
            });
        }
            break;
        case "/confirmados": {
            makeRequest(process.env.HOST_COVID, process.env.PATH_COVID_CONFIRMADOS).then(data => {
                data = JSON.parse(data);
                let masculinos = 0;
                let femeninos = 0;
                data.map(elem => {
                    elem.sexo == 'masculino' ? masculinos += elem.cantidad : femeninos += elem.cantidad
                });
                const totales = masculinos + femeninos;
                bot.sendMessage(chatId, `*Casos Femeninos:* ${femeninos}\n*Casos Masculinos:* ${masculinos}\n*Casos Totales:* ${totales}`, { parse_mode: "Markdown" });
            }).catch(e => {
                console.log(e);
            });
        }
            break;
        case "/contacto": {
            bot.sendMessage(
                chatId,
                `- Si tenés síntomas, llamá al 107\n- Para información y asesoramiento, llamá al 148 o al 08002221002\n- Para denuncias, llamá al 911\n- Para personas que sufran el encierro: 4551159 y 2914261642  (lunes a viernes de 8 a 15 horas).`,
                { parse_mode: "Markdown" });
        }
            break;
        case "/dolar": {
            makeRequest(process.env.HOST_DOLAR, process.env.PATH_DOLAR).then(data => {
                data = JSON.parse(data);
                const arr = data.map(elem => `*${capitalize(elem.casa.nombre)}* - Compra: ${elem.casa.compra} - Venta: ${elem.casa.venta}`);
                bot.sendMessage(chatId, arr.join('\n'), { parse_mode: "Markdown" });
            }).catch(e => {
                console.log(e);
            });
        }
            break;
        case "/clima": {
            makeRequest(process.env.HOST_CLIMA, process.env.PATH_CLIMA).then(data => {
                data = JSON.parse(data);
                let msg = '';
                msg += `*Temperatura actual:* ${data.current.temp}°C\n`;
                msg += "*HOY*\n";
                msg += `*Máxima:* ${data.daily[0].temp.max}°C\n`;
                msg += `*Mínima:* ${data.daily[0].temp.min}°C\n`;
                msg += "*MAÑANA*\n";
                msg += `*Máxima:* ${data.daily[1].temp.max}°C\n`;
                msg += `*Mínima:* ${data.daily[1].temp.min}°C\n`;
                bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
            }).catch(e => {
                console.log(e);
            });
        }
            break;
        case "/bot":
        case "/help":
        case "/ayuda":
        case "/start": {
            bot.sendMessage(
                chatId,
                `/casos - Resumen de situación actual\n/confirmados - Confirmados por sexo\n/camas - Estado de camas\n/contacto - Teléfonos de contacto\n/dolar - Cotizaciones del dolar\n/clima - Temperatura actual`,
                { parse_mode: "Markdown" });
        }
            break;

    }
});


const app = express();

app.use(bodyParser.json());

app.listen(process.env.PORT || 5000);

app.post('/' + bot.token, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});