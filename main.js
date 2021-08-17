import './style.css'

document.querySelector('#app').innerHTML = `
  <h1>Hello Vite!</h1>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
`
const PORT = 3500

const io = require('socket.io')(PORT, {
    cors: {
        origin: [
            'http://localhost:3000',
            'http://connectyfourgame.com:80'
        ]
    }
})

io.on('connection', socket => {
    console.log(socket.id)
    socket.on("drop", () => {
                
    })
})
