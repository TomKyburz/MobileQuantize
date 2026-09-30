import { Server } from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import mime from 'mime'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const server = new Server((req, res) => {
  console.log('REQUEST:', req.method, JSON.stringify(req.url))
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

    const urlPath = decodeURIComponent(req.url.split('?')[0])

    if (urlPath === '/') {
      res.writeHead(302, {
        Location: '/quantize/home/index.html'
      })
      res.end()
      return
    }

    let filePath

    if (urlPath === '/index.html') {
      filePath = path.join(__dirname, 'quantize/home/index.html')
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
      'Content-Type': mime.getType(filePath) || 'application/octet-stream'
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

const port = process.env.PORT || 5000

server.listen(port, () => {
  console.log(`Server running on ${port}`)
})
