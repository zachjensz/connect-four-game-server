const PORT = 5000

const io = require('socket.io')(PORT, {
  cors: {
    origin: [`http://localhost:3000`, 'http://connectyfourgame.com:80']
  }
})

io.on('connection', (socket) => {
  console.log(socket.id)
  socket.on('drop', () => {})
})
