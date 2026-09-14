require('dotenv').config()
const http = require('node:http')

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ ok: true, service: 'neermei' }))
    return
  }
  response.writeHead(404, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify({ message: 'Not found' }))
})

const port = Number(process.env.PORT || 5000)
server.listen(port, () => console.log(`Health server running on port ${port}`))
