import { Server } from 'node:http'
import WebSocket, { WebSocketServer } from 'ws'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import mime from 'mime'
import webpush from 'web-push'

const require = createRequire(import.meta.url)
const accessTokens = require('access-tokens.json')
const allowedTokens = Object.entries(accessTokens).reduce(
  (sum, [k, v]) => ({
    ...sum,
    [v.code]: {
      name: k,
      roles: v.roles || []
    }
  }),
  {}
)

const VAPID_PUBLIC = 'BAE6g8gLvVBZRQpNSXoleYmEMndyJbnRBDMtMxOT7_vMyNKXfUtRjg69L4TU3q_MYciNnx4GX4S4rLqYaJLL7Qg';
const VAPID_PRIVATE = 'o_8r1W8pXvOZ7OGUJyK9EeOUsut-NN38UiKYUN0vTP4'

webpush.setVapidDetails(
  'mailto:you@example.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

let subscriptions = [];
try {
  subscriptions = JSON.parse(fs.readFileSync('subscriptions.json', 'utf-8'));
} catch (e) {
  console.log('No previous subscriptions found');
}

const server = new Server()

server.on('request', async (req, res) => {
  try {
    if (req.url === '/subscribe' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const subscription = JSON.parse(body);

        // avoid duplicates
        if (!subscriptions.find(s => s.endpoint === subscription.endpoint)) {
          subscriptions.push(subscription);
          fs.writeFileSync('subscriptions.json', JSON.stringify(subscriptions, null, 2));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      });
      return;
    }

    if (req.url === '/getinfo/' && req.method === 'GET') {
	res.write('Quantize');
	res.write('Status: Online);
    }

    if (req.url === '/notify' && req.method === 'POST') {
      subscriptions = subscriptions.filter(sub => {
        webpush.sendNotification(sub, JSON.stringify({
          title: "Test Notification",
          body: "This is a test!"
        })).catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log('Removing expired subscription:', sub.endpoint);
            return false; // remove from array
          }
          console.error(err);
          return true; // keep subscription
        });
        return true;
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    }



    if (req.url.startsWith('/validate-token')) {
      const token = req.url.split('/').slice(-1)?.[0];
      if (token && allowedTokens[token]) {
        const secure = process.env.IS_OFFLINE ? '' : 'Secure;';
        res.writeHead(200, {
          'set-cookie': `token=${token}; Path=/; HttpOnly; SameSite=Strict; ${secure}`
        });
      } else {
        res.writeHead(401);
      }
      res.end();
      return;
    }

    // Static file handler
    const url = req.url.slice(1).split('?')[0] || 'quantize/index.html';
    // if (url.includes('..') || url === 'access-tokens.json') {
    //   throw new TypeError('invalid path');
    // }
    // res.writeHead(200, {
    //   'Content-Type': mime.getType(url),
    //   'Cache-Control': 'no-cache'
    // });
    for await (const chunk of fs.createReadStream(url)) {
      res.write(chunk);
    }
    res.end();

  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(404);
    }
    res.end();
  }
});


const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', function upgrade (req, socket, head) {
  if (req.url === '/session') {
    const token = (Object.entries(req.headers).find(
      ([key, value]) => key.toLowerCase() === 'cookie'
    ) || [])[1]?.match(/token=([^;]+)/)?.[1]
    if (allowedTokens[token]) {
      wss.handleUpgrade(req, socket, head, function done (ws) {
        wss.emit('connection', ws, req)
      })
    } else {
      socket.destroy()
    }
  } else {
    socket.destroy()
  }
})

wss.on('connection', function onConnection (ws, req) {
  const token = (Object.entries(req.headers).find(
    ([key, value]) => key.toLowerCase() === 'cookie'
  ) || [])[1]?.match(/token=([^;]+)/)?.[1]

  const name = allowedTokens[token]?.name

  const user = {
    "Name": `${name}`
  }
  const userdata = JSON.stringify(user)


  if (!name) {
    ws.close()
    return
  }

  for (const client of wss.clients) {
    client.send(
      JSON.stringify({
        type: 'connected',
        name
      }),
      { binary: false }
    )
  }
  ws.on('close', function onClose (alert) {
    for (const client of wss.clients) {
      client.send(
        JSON.stringify({
          type: 'disconnected',
          name
        }),
        { binary: false }
      )
    }
  })
  ws.on('message', function onMessage (data) {
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'message',
            name,
            data: data.toString()
          }),
          { binary: false }
        )
      }
    }
  })
})

const port = process.env.PORT || 5000

server.listen(port, () => console.log(`Server started on port ${port}`))
