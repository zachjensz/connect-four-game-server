const PORT = 5000

const io = require('socket.io')(PORT, {
  cors: {
    origin: [`http://localhost:3000`, 'http://connectyfourgame.com:80']
  }
})

io.on('connection', (socket) => {
  console.log(socket.id + ' has joined')
  socket.on('drop', (column) => {
    console.log(column)
    socket.broadcast.emit('drop', column)
  })
  socket.on('disconnect', () => {
    console.log(socket.id + ' has left')
  })
})
