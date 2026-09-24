import { Server } from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import mime from 'mime'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import WebSocket, { WebSocketServer } from 'ws'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEPLOY_TOKEN = process.env.DEPLOY_TOKEN

const usersPath = path.join(__dirname, 'quantize/users.json')

function getUsers() {
  try {
    return JSON.parse(fs.readFileSync(usersPath, 'utf8'))
  } catch (err) {
    console.error('Failed to read users.json:', err)
    return []
  }
}

function getUserByCode(code) {
  const users = getUsers()
  return users.find(user => user.code === code)
}

const server = new Server((req, res) => {
  try {

    // Deploy endpoint
    if (req.method === 'POST' && req.url === '/api/deploy') {
      execFile('/home/pi/deploy.sh', (err, stdout, stderr) => {
        if (err) {
          console.error('Deploy failed:', stderr)

          res.writeHead(500, {
            'Content-Type': 'application/json'
          })

          return res.end(JSON.stringify({
            success: false,
            error: stderr || err.message
          }))
        }

        res.writeHead(200, {
          'Content-Type': 'application/json'
        })

        res.end(JSON.stringify({
          success: true,
          output: stdout
        }), () => {
          setTimeout(() => {
            execFile(
              'sudo',
              ['systemctl', 'restart', 'bootweb.service'],
              restartErr => {
                if (restartErr) {
                  console.error('Restart failed:', restartErr)
                } else {
                  console.log('Server restart initiated')
                }
              }
            )
          }, 500)
        })
      })

      return
    }

    // Access-code validation
    if (
      req.method === 'GET' &&
      req.url.startsWith('/quantize/users.json/')
    ) {
      const code = decodeURIComponent(
        req.url
          .substring('/quantize/users.json/'.length)
          .split('?')[0]
      )

      const user = getUserByCode(code)

      if (user) {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        })

        res.end(JSON.stringify(user))
      } else {
        res.writeHead(401)
        res.end()
      }

      return
    }

    // Static-file server
    const urlPath = decodeURIComponent(req.url.split('?')[0])
    let filePath

    if (urlPath === '/' || urlPath === '/index.html') {
      filePath = path.join(__dirname, 'quantize/index.html')
    } else if (urlPath.startsWith('/quantize/')) {
      filePath = path.join(__dirname, urlPath.substring(1))
    } else {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404)
      res.end('Not Found')
      return
    }

    res.writeHead(200, {
      'Content-Type': mime.getType(filePath) || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    })

    fs.createReadStream(filePath).pipe(res)

  } catch (err) {
    console.error(err)

    if (!res.headersSent) {
      res.writeHead(500)
    }

    res.end()
  }
})


const wss = new WebSocketServer({
  noServer: true
})

const players = {}

server.on('upgrade', (req, socket, head) => {
  if (req.url === '/ws') {
    wss.handleUpgrade(
      req,
      socket,
      head,
      ws => wss.emit('connection', ws, req)
    )
  } else {
    socket.destroy()
  }
})


let nextId = 1

wss.on('connection', ws => {
  const id = nextId++

  players[id] = {
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0
  }

  let user = null

  // Send connection ID.
  ws.send(JSON.stringify({
    type: 'init',
    id
  }))

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg.toString())

      // Authenticate the WebSocket connection.
      if (data.type === 'auth') {
        const authenticatedUser = getUserByCode(data.code)

        if (!authenticatedUser) {
          ws.send(JSON.stringify({
            type: 'auth',
            success: false
          }))

          ws.close()
          return
        }

        user = authenticatedUser

        ws.send(JSON.stringify({
          type: 'auth',
          success: true,
          username: user.username
        }))

        console.log(
          `User authenticated: ${user.username} (${id})`
        )

        return
      }

      // Ignore everything except authentication
      // until the connection has been authenticated.
      if (!user) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Not authenticated'
        }))

        return
      }

      // Player position update.
      if (data.type === 'update') {
        players[id] = {
          x: data.x,
          y: data.y,
          z: data.z,
          rotationY: data.rotationY
        }

        return
      }

      // Chat message.
      if (data.type === 'chat') {
        const message = {
          type: 'chat',
          senderId: id,
          username: user.username,
          ign: user.ign,
          pfp: user.pfp,
          data: String(data.data || '')
        }

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message))
          }
        })

        return
      }

    } catch (err) {
      console.error('Invalid WebSocket message:', err)
    }
  })


  // Broadcast other players.
  const broadcastLoop = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const others = Object.entries(players)
        .filter(([pid]) => parseInt(pid) !== id)
        .map(([pid, player]) => ({
          id: pid,
          ...player
        }))

      ws.send(JSON.stringify({
        type: 'players',
        players: others
      }))
    }
  }, 50)


  // Handle disconnect.
  ws.on('close', () => {
    clearInterval(broadcastLoop)

    delete players[id]

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'disconnect',
          id
        }))
      }
    })

    if (user) {
      console.log(
        `User disconnected: ${user.username} (${id})`
      )
    }
  })
})


const port = process.env.PORT || 5000

server.listen(port, () => {
  console.log(`Server running on ${port}`)
})
