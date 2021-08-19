const PORT = 5000
const io = require("socket.io")(PORT, {
  cors: {
    //origin: ['http://localhost:3000', 'http://connectfourgame.com:80']
    origin: "*", // Yikes!!!
  },
})
io.on("connection", (socket) => addClient(socket))

const clientSockets = []
const getSocketById = (id) => clientSockets.find(socket => socket.id === id)

const gamesBeingPlayed = []

// The socket.id's of players looking for opponents
const lookingForOpponents = []
function addClient(socket) {
  const emitHandlers = []
  clientSockets.push(socket)

  console.log(`${socket.id} has joined`)

  // player has disconnected
  emitHandlers.push([
    "disconnect",
    () => {
      console.log(`${socket.id} has left`)
    },
  ])

  // player is looking for an opponent
  emitHandlers.push([
    "find-opponent",
    () => {
      console.log(`${socket.id} is looking for an opponent`)
      // The (! in) !lookingForOpponents is because push returns new length
      const opponentId =
        lookingForOpponents.length === 0
          ? !lookingForOpponents.push(socket.id)
          : lookingForOpponents.shift()
      if (!opponentId) {
        console.log(`${socket.id} is waiting for an opponent`)
        return
      }
      const opponentSocket = getSocketById(opponentId)
      socket.emit('opponent-found', opponentId)
      opponentSocket.emit('opponent-found', socket.id)
      gamesBeingPlayed.push({
        startingPlayer: randomPlayer(),
        opponentId,
        opponentSocket
      })
      console.log(`${socket.id} is playing a game with ${opponentId}`)
    },
  ])

  // player made a drop
  emitHandlers.push([
    "drop",
    (column) => {
      console.log(`${socket.id} drops in column ${column}`)
      socket.broadcast.emit("drop", column)
    },
  ])

  // Adds all of the emit handlers
  emitHandlers.forEach(([name, handler]) => socket.on(name, handler))
}

const randomPlayer = () => Math.floor(Math.random() * 2)