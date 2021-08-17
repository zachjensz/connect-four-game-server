const clientSockets = []
const PORT = 5000
const io = require("socket.io")(PORT, {
  cors: {
    //origin: ['http://localhost:3000', 'http://connectfourgame.com:80']
    origin: '*', // Yikes!!!
  },
})

io.on("connection", (socket) => addClient(socket))

function addClient(socket) {
  const emitHandlers = []
  clientSockets.push(socket)

  console.log(`${socket.id} has joined`)

  emitHandlers.push(['disconnect', () => {
    console.log(`${socket.id} has left`)
  }])

  emitHandlers.push(['find-opponent', () => {
    console.log(`${socket.id} is looking for an opponent`)
  }])

  emitHandlers.push(['drop',  (column) => {
    console.log(`${socket.id} drops in column ${column}`)
    socket.broadcast.emit("drop", column)
  }])

  emitHandlers.forEach(([name, handler]) => socket.on(name, handler))
}
