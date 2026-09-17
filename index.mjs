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

const server = new Server((req,res)=>{
  try {

    // Deploy endpoint
    if(req.method === 'POST' && req.url === '/api/deploy'){
      if(req.headers.authorization !== `Bearer ${DEPLOY_TOKEN}`){
        res.writeHead(401, { 'Content-Type':'application/json' })
        res.end(JSON.stringify({ error:'Unauthorized' }))
        return
      }

      execFile('/home/pi/scripts/deploy.sh', (err, stdout, stderr)=>{
        if(err){
          console.error('Deploy failed:', stderr)

          res.writeHead(500, { 'Content-Type':'application/json' })
          res.end(JSON.stringify({
            success:false,
            error:stderr || err.message
          }))
          return
        }

        console.log('Deploy successful:', stdout)

        res.writeHead(200, { 'Content-Type':'application/json' })
        res.end(JSON.stringify({
          success:true,
          output:stdout
        }))
      })

      return
    }

    // Existing static-file server
    const urlPath = decodeURIComponent(req.url.split('?')[0])
    let filePath

    if(urlPath==='/' || urlPath==='/index.html'){
      filePath=path.join(__dirname,'quantize/index.html')
    }
    else if(urlPath.startsWith('/quantize/')){
      filePath=path.join(__dirname,urlPath.substring(1))
    }
    else {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    if(!fs.existsSync(filePath)){
      res.writeHead(404)
      res.end('Not Found')
      return
    }

    res.writeHead(200,{
      'Content-Type':mime.getType(filePath)||'application/octet-stream',
      'Cache-Control':'no-cache'
    })

    fs.createReadStream(filePath).pipe(res)

  } catch(err){
    console.error(err)
    if(!res.headersSent) res.writeHead(500)
    res.end()
  }
})


const wss = new WebSocketServer({ noServer:true })
const players = {} // id -> { x, y, z, rotationY }

server.on('upgrade', (req,socket,head)=>{
  if(req.url==='/ws'){
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req))
  } else { socket.destroy() }
})

let nextId = 1
wss.on('connection', ws=>{
  const id = nextId++
  players[id] = { x:0,y:0,z:0, rotationY:0 }
  ws.send(JSON.stringify({ type:'init', id }))

  ws.on('message', msg=>{
    try {
      const data = JSON.parse(msg.toString())
      if(data.type==='update'){
        players[id]= { x:data.x, y:data.y, z:data.z, rotationY:data.rotationY }
      }
    } catch(e){ console.error(e) }
  })

  const broadcastLoop = setInterval(()=>{
    if(ws.readyState===WebSocket.OPEN){
      const others = Object.entries(players)
        .filter(([pid])=>parseInt(pid)!==id)
        .map(([pid,p])=>({ id:pid, ...p }))
      ws.send(JSON.stringify({ type:'players', players:others }))
    }
  }, 50)

  ws.on('close', ()=>{
    clearInterval(broadcastLoop)
    delete players[id]
    // broadcast disconnect
    wss.clients.forEach(c=>{
      if(c.readyState===WebSocket.OPEN){
        c.send(JSON.stringify({ type:'disconnect', id }))
      }
    })
  })
})

const port = process.env.PORT||5000
server.listen(port,()=>console.log(`Server running on ${port}`))
