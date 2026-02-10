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

    if (req.url === '/getinfo' && req.method === 'GET') {
        // Set the header for plain text output
        res.writeHead(200, { 'Content-Type': 'text/plain' });

        // --- Step 1: Send the Loading Bar ---
        const totalDuration = 3000; // 3 seconds
        const steps = 30;
        const interval = totalDuration / steps;

        let currentStep = 0;
        const loaderInterval = setInterval(() => {
            if (currentStep < steps) {
                // The '\r' character moves the cursor to the start of the line, 
                // overwriting the previous bar state.
                const bar = "[" + "=".repeat(currentStep) + " ".repeat(steps - currentStep) + "]";
                const percent = Math.round((currentStep / steps) * 100);
                
                // Use res.write to send a partial, unbuffered response
                res.write(`\rLoading Quantize... ${bar} ${percent}%`); 
                currentStep++;
            } else {
                clearInterval(loaderInterval);
                
                // --- Step 2: Clear the Loading Bar Line ---
                // Send a newline to end the loading bar line, then clear it 
                // with spaces and a final newline.
                res.write('\r' + ' '.repeat(50) + '\n\n'); 
                
                // --- Step 3: Print ASCII Art and Live Info ---
                res.write('QUANTIZE' + '\n');
                
                // Live Info Section
                const liveInfo = [
                    '--------------------------------------------------',
                    `STATUS: Online (200 OK)`,
                    `USER COUNT: 1,452,000`,
                    `SERVER LATENCY: 45ms (US-East)`,
                    '--------------------------------------------------'
                ].join('\n'); // Join array elements with newlines

                res.end(liveInfo + '\n'); // res.end() sends the final data and closes the connection
            }
        }, interval);

        return; // CRITICAL: Stop further execution
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
