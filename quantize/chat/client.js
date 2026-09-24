async function chat() {
  const code = prompt('Access code:')

  if (!code) {
    window.location.reload()
    return
  }

  const res = await fetch(`/quantize/users.json/${encodeURIComponent(code)}`)

  if (res.status !== 200) {
    window.location.reload()
    return
  }

  const user = await res.json()

  console.log('Logged in as:', user.username)
  console.log('IGN:', user.ign)
  console.log('PFP:', user.pfp)

  const main = window.document.body.querySelector('main')
  const form = window.document.body.querySelector('form')
  const input = window.document.body.querySelector('input')

  if (!main || !form || !input) {
    console.error('Chat elements not found')
    return
  }

  const sessionUrl = `${
    window.location.protocol === 'http:' ? 'ws' : 'wss'
  }://${window.location.hostname}${
    window.location.port ? `:${window.location.port}` : ''
  }/ws`

  const client = new WebSocket(sessionUrl)

  let clientId = null
  let authenticated = false

  client.onopen = () => {
    console.log('WebSocket connected')

    client.send(JSON.stringify({
      type: 'auth',
      code
    }))
  }

  client.onmessage = function onMessage(event) {
    let message

    try {
      message = JSON.parse(event.data)
    } catch (err) {
      console.error('Invalid WebSocket message:', event.data)
      return
    }

    if (message.type === 'init') {
      clientId = message.id
      console.log('Connected with ID:', clientId)
      return
    }

    if (message.type === 'auth') {
      if (message.success) {
        authenticated = true
        console.log('WebSocket authenticated as:', message.username)
      } else {
        console.error('WebSocket authentication failed')
        client.close()
      }

      return
    }

    if (message.type === 'players') {
      return
    }

    if (message.type === 'disconnect') {
      return
    }

    if (message.type === 'chat') {
      const div = document.createElement('div')
      const pfp = document.createElement('img')
      const twrap = document.createElement('div')
      const p = document.createElement('p')
      const username = document.createElement('p')

      if (message.senderId === clientId) {
        div.classList.add('sent')
      } else {
        div.classList.add('receive')
      }

      pfp.src = message.pfp || ''
      pfp.alt = message.username || 'User'

      twrap.classList.add('twrap')

      username.textContent = message.username || 'Unknown'
      username.classList.add('tname')

      p.classList.add('text')
      p.textContent = message.data || ''

      twrap.appendChild(username)
      twrap.appendChild(p)

      div.appendChild(pfp)
      div.appendChild(twrap)

      main.appendChild(div)
      main.scrollTop = main.scrollHeight

      return
    }

    console.warn('Unknown WebSocket message:', message)
  }

  client.onclose = () => {
    authenticated = false
    console.log('WebSocket disconnected')
  }

  client.onerror = error => {
    console.error('WebSocket error:', error)
  }

  form.onsubmit = e => {
    e.preventDefault()

    const message = input.value.trim()

    if (!message) {
      return
    }

    if (client.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected')
      return
    }

    if (!authenticated) {
      console.error('WebSocket is not authenticated')
      return
    }

    client.send(JSON.stringify({
      type: 'chat',
      data: message
    }))

    input.value = ''
  }
}

chat().catch(console.error)
