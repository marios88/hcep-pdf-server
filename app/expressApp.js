const expressApp = (page) => {
  const bodyParser = require('body-parser')
  const debug = require('debug')('hcepPdfServer')
  const express = require('express')
  const morgan = require('morgan')
  const timeout = require('connect-timeout')
  const { getPdfOption } = require('./pdfOption')
  const appTimeoutMsec = process.env.HCEP_APP_TIMEOUT_MSEC || 30000
  const pageTimeoutMsec = process.env.HCEP_PAGE_TIMEOUT_MSEC || 10000
  const listenPort = process.env.HCEP_PORT || 8000
  /* bytes or string for https://www.npmjs.com/package/bytes */
  const maxRquestSize = process.env.HCEP_MAX_REQUIEST_SIZE || '10mb'

  const app = express()
  const env = app.get('env')
  console.log('env:', env)
  if (env == 'production') {
    app.use(morgan())
  } else {
    app.use(morgan('dev'))
  }

  app.use(bodyParser.urlencoded({ extended: false, limit: maxRquestSize }))
  app.use(timeout(appTimeoutMsec))
  app.listen(listenPort, () => {
    console.log('Listening on:', listenPort)
  })

  /**
   * get()
   *  Receive get request with target page's url
   *  @req.query.url {String} page's url
   *  @req.query.pdf_option {String} a key of pdfOptions
   * @return binary of PDF or error response (400 or 500)
   */
  app.route('/')
    .get(async (req, res) => {
      const url = req.query.url
      if (!url) {
        res.status(400)
        res.end('get parameter "url" is not set')
        return
      }
      try {
        await page.goto(
          url, {
            timeout: pageTimeoutMsec,
            waitUntil: ["load", "domcontentloaded"]
          }
        )
        const buff = await page.pdf(getPdfOption(req.query.pdf_option))
        res.status(200)
        res.contentType("application/pdf")
        res.send(buff)
        res.end()
      } catch (e) {
        console.error(e)
        res.contentType("text/plain")
        res.status(500)
        res.end()
      }
    })
    /**
     * post()
     * Receive post request with target html
     * @req.body.html {String} page's html content
     * @req.body.pdf_option {String} a key of pdfOptions
     * @return binary of PDF or error response (400 or 500)
     */
    .post(async (req, res) => {
      const html = req.body.html
      if (!html) {
        res.status(400)
        res.contentType("text/plain")
        res.end('post parameter "html" is not set')
        return
      }
      try {
        await page.setContent(decodeURIComponent(html))
        const buff = await page.pdf(getPdfOption(req.body.pdf_option))
        res.status(200)
        res.contentType("application/pdf")
        res.send(buff)
        res.end()
      } catch (e) {
        console.error(e)
        res.contentType("text/plain")
        res.status(500)
        res.end()
      }
    })

  /**
   * get()
   * Receive get request with target page's url
   * @req.query.url {String} page's url
   * @return binary of PNG or error response (400 or 500)
   */
  app.route('/screenshot')
    .get(async (req, res) => {
      const url = req.query.url
      if (!url) {
        res.status(400)
        res.contentType("text/plain")
        res.end('get parameter "url" is not set')
        return
      }
      try {
        await page.goto(
          url, {
            timeout: pageTimeoutMsec,
            waitUntil: ["load", "domcontentloaded"]
          }
        )
        const buff = await page.screenshot({ fullPage: true })
        res.status(200)
        res.contentType("image/png")
        res.send(buff)
        res.end()
      } catch (e) {
        console.error(e)
        res.contentType("text/plain")
        res.status(500)
        res.end()
      }
    })
    /**
     * post()
     * Receive post request with target html
     * @req.body.html {String} page's html content
     * @return binary of PNG or error response (400 or 500)
     */
    .post(async (req, res) => {
      const html = req.body.html
      if (!html) {
        await res.status(400)
        res.end('post parameter "html" is not set')
        return
      }
      try {
        await page.setContent(decodeURIComponent(html))
        const buff = await page.screenshot({ fullPage: true })
        res.status(200)
        res.contentType("image/png")
        res.send(buff)
        res.end()
      } catch (e) {
        console.error(e)
        res.status(500)
        res.end()
      }
    })

  /**
   * Health Check
   */
  app.get('/hc', async (req, res) => {
    debug('health check ok')
    res.status(200)
    res.end('ok')
  })
  return app
}

module.exports.expressApp = expressApp
