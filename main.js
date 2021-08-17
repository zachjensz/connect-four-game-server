const clientSockets = []
const PORT = 5000
const io = require("socket.io")(PORT, {
  cors: {
    //origin: ['http://localhost:3000', 'http://connectfourgame.com:80']
    origin: "*",
  },
})

function addClient(socket) {
  const eventHandlers = []
  clientSockets.push(socket)

  console.log(socket.id + " has joined")

  eventHandlers.push(['disconnect', () => {
    console.log(socket.id + " has left")
  }])

  eventHandlers.push(['drop',  (column) => {
    console.log("drop: ", column)
    socket.broadcast.emit("drop", column)
  }])

  return {
    eventHandlers,
  }
}

io.on("connection", (socket) => {
  const { eventHandlers } = addClient(socket)
  eventHandlers.forEach(([name, handler]) => socket.on(name, handler))
})
