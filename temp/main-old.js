const socket = require("socket.io")
const db = require("./db.js").db

db.set('gamesStartedSinceServerStart', 0)
db.set('gamesFinishedSinceServerStart', 0)

// Setup server on port 5000 and listen for connections
const PORT = 5000
const io = socket(PORT, {
  cors: {
    //origin: ['http://localhost:3000', 'http://connectfourgame.com:80']
    origin: "*", // Yikes!!!
  },
})
io.on("connection", (socket) => addClient(socket))

// All of the sockets for all of the clients
const clientSockets = []
const getSocketById = (id) => clientSockets.find((socket) => socket.id === id)
const removeSocketById = (id) =>
  clientSockets.filter((socket) => socket.id !== id)

// Games in-progress
const gamesBeingPlayed = []
const getGameBeingPlayed = (id) =>
  gamesBeingPlayed.find(
    (game) => game.player1Socket.id === id || game.player2Socket.id === id
  )

const findOpponentSocket = (id) => {
  const game = getGameBeingPlayed(id)
  return game?.player1Socket.id === id ? game.player2Socket : game?.player1Socket
}

function removeFromLookingFor(socketId) {
  lookingForOpponents = lookingForOpponents.filter((ele) => ele !== socketId)
}

// The socket.id's of players looking for opponents
let lookingForOpponents = []
function addClient(socket) {
  const emitHandlers = []
  clientSockets.push(socket)

  console.log(`${socket.id} has joined`)

  // player has disconnected
  emitHandlers.push([
    "disconnect",
    () => {
      console.log(`${socket.id} has left`)
      removeSocketById(socket.id)
      removeFromLookingFor(socket.id)
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
      removeFromLookingFor(socket.id)
      removeFromLookingFor(opponentSocket.id)
      // Emit to both players that an opponent was found
      const startingPlayer = randomPlayer()
      socket.emit("opponent-found", {
        id: opponentId,
        startingPlayer: !!startingPlayer,
      })
      opponentSocket.emit("opponent-found", {
        id: socket.id,
        startingPlayer: !startingPlayer,
      })
      gamesBeingPlayed.push({
        player1Socket: socket,
        player2Socket: opponentSocket,
        playerTurn: startingPlayer,
      })
      console.log(`${socket.id} is playing a game with ${opponentId}`)
    },
  ])

  // player made a drop
  emitHandlers.push([
    "drop",
    (column) => {
      const game = getGameBeingPlayed(socket.id)
      if (!game) return
      const playerNumber = game.player1Socket.id === socket.id ? 1 : 2
      if (playerNumber != game.playerTurn) {
        console.warn(`${socket.id} is trying to play when it's not their turn`)
        return
      }

      const opponentSocket =
        game.player1Socket.id === socket.id
          ? game.player2Socket
          : game.player1Socket
      console.log(
        `${socket.id} drops in column ${column} (playing against ${opponentSocket.id})`
      )
      opponentSocket.emit("drop", column)
      game.playerTurn = playerNumber === 1 ? 2 : 1
    },
  ])

  // Adds all of the emit handlers
  emitHandlers.forEach(([name, handler]) => socket.on(name, handler))
}

const randomPlayer = () => Math.floor(Math.random() * 2)
