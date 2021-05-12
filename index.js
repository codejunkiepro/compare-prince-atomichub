require('dotenv').config()
const morgan = require('morgan')
const express = require('express')
const socketIo = require('socket.io')
const cors = require('cors')
const Scrapping = require('./routes/Scrapping')
const puppeteer = require('puppeteer-extra');
// const injectFile = require('puppeteer-inject-file');
puppeteer.use(require('puppeteer-extra-plugin-angular')());

const app = express()

const fs = require('fs');

// Set template engine
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')

const PORT = process.env.PORT || 8080


///start server
const server = app.listen(PORT, () => console.log('Application listening at port:', PORT))

// set socket io

const io = socketIo(server);

app.io = io;

let interval = setInterval(() => {
    scrappingTool()
}, 1000 * 60 * 3); // 3 minites

io.on("connection", (socket) => {
    console.log("Made socket connection!");
    // io.emit('hello', 'world')
    const content = fs.readFileSync('./urls.json', 'utf8')
    let variables = fs.readFileSync('./variable.json', 'utf8')
    variables = JSON.parse(variables)
    socket.emit('start', JSON.parse(content), variables)

    socket.on('add-url', (url) => {
        let fileContent = fs.readFileSync('./urls.json', 'utf8');
        fileContent = JSON.parse(fileContent)
        fileContent.push(url)
        fileContent = JSON.stringify(fileContent, null, 2)
        fs.writeFileSync('./urls.json', fileContent, 'utf8')
    })

    socket.on('change-price', (rate) => {
        let variable = fs.readFileSync('./variable.json', 'utf8');
        variable = JSON.parse(variable)
        variable.rate = rate
        variable = JSON.stringify(variable, null, 2)
        fs.writeFileSync('./variable.json', variable, 'utf8')
    })
})

const scrappingTool = async () => {
    try {
        const browser = await puppeteer.launch({ headless: true, args: ['no-sandbox', "--window-size=1600,1000"] })

        let fileContent = await fs.readFileSync('./urls.json', 'utf8');
        fileContent = JSON.parse(fileContent)
        let variable = fs.readFileSync('./variable.json', 'utf-8')
        variable = JSON.parse(variable)

        for (let url of fileContent) {
            await sendResultUsingSocket(browser, url, variable)
        }

        await browser.close()
    } catch (error) {
        console.log(error)
    }
}

const sendResultUsingSocket = async (browser, url, variable) => {
    try {
        const page = await browser.newPage()
        await page.setViewport({ width: 1600, height: 700 })
        await page.setDefaultNavigationTimeout(0);
        // const result = await getResult(page, fileContent[0])
        // const url = fileContent[0]
        await page.goto(url, {
            waitUntil: 'networkidle2',
        });

        // await page.clickIfExists(`.CookieModal .modal-content button.btn-primary`, "check Click");
        const cookieBtn = await page.$('.CookieModal .modal-content button.btn-primary')
        if (cookieBtn)
            await cookieBtn.click()

        await page.waitForSelector('.large-card .asset-price.text-truncate', { timeout: 30000 })
        console.log('Find large-card')
        const elements = await page.$$('.large-card .asset-price.text-truncate')

        let firstPrice = null, secondPrice = null;
        if (elements.length) {
            firstPrice = await elements[0].evaluate(e => e.innerText)
            secondPrice = await elements[1].evaluate(e => e.innerText)
            firstPrice = firstPrice.split(' WAX')[0]
            secondPrice = secondPrice.split(' WAX')[0]

        }

        if (firstPrice && secondPrice) {
            firstPrice = parseFloat(firstPrice)
            secondPrice = parseFloat(secondPrice)
            const prices = [firstPrice, secondPrice];
            console.log(Math.max(...prices), prices)
            if (Math.min(...prices) <= Math.max(...prices) * ((100 - variable.rate) / 100)) {
                io.emit('fall', url, Math.min(...prices), Math.max(...prices), variable.rate)
            } else {
                io.emit('unFall', url, Math.min(...prices), Math.max(...prices), variable.rate)
            }
        }
    } catch (error) {
        console.log(error)
    }
}


scrappingTool()
app.use(function (req, res, next) {
    req.io = io;
    next();
})

// Set application settings
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))


if (process.env.NODE_ENV == 'dev')
    app.use(morgan('dev'))

app.use(express.static('public'))
app.use([Scrapping])

