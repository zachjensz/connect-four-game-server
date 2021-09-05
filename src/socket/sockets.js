const socket = require("socket.io")
const aes = require('aes256')
const { db } = require("../util/db.js")

// Setup server on port 5000 and listen for connections
const PORT = 4000
const io = socket(PORT, {
  cors: {
    //origin: ['http://localhost:3000', 'http://connectfourgame.com:80']
    origin: "*", // Yikes!!!
  },
})

// All of the sockets for all of the clients
const clientSockets = []
const getSocketById = (id) => clientSockets.find((socket) => socket.id === id)
const removeSocketById = (id) =>
  clientSockets.filter((socket) => socket.id !== id)

// The socket.id's of players looking for opponents
let lookingForOpponents = []

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

// Deactivates the auth emit handler
let authenticatedSockets = []

// listening for connections to server
io.on("connection", (socket) => {

  // Add to collection of all connected clients
  clientSockets.push(socket)

  // Close unused connection in 3 seconds if not authenticated
  const disconnectTimeout = setTimeout(() => {
    socket.close()
  }, 3000);

  socket.on("auth", (jwToken) => {
    // Already authenticated - return
    if (authenticatedSockets.includes(socket)) return

    // TODO: Verifies that a valid JWT was received

    // key-value pairs of a user's jwt and their ephemeral aes256 encryption key
    const passwords = db.get('serverPasswords') ?? {}

    // Did this user obtain a key from express server?
    if (passwords.keys.includes(jwToken)) {
      // Stop the auto-disconnection timeout
      clearTimeout(disconnectTimeout)

      // add an on disconnect clean-up
      socket.on('disconnect', () => {
        console.log(`${socket.id} has left`)
        removeSocketById(socket.id)
        removeFromLookingFor(socket.id)
        authenticatedSockets = 
          authenticatedSockets.filter((socket) => socket.id !== socket.id)
      })

      // Stop the client from authenticating after authenticated
      authenticatedSockets.push(socket)

      // The emit handler is the only socket.on event handler after authentication...
      // It decrypts the encrypted payload and sends decrypted data to the messageHandler
      socket.on("emit", (payload) => processEncryptedPayload(socket, jwToken, payload))      
    }
  })  
})

function processEncryptedPayload(socket, jwToken, payload) {
  const passwords = db.get(serverPasswords) ?? {}
  const password = passwords[jwToken]
  if (!password) return
  messageHandler(socket, jwToken, aes.decrypt(password, payload))
}

function messageHandler(socket, jwToken, message) {
  const emitHandlers = []

  console.log(`${socket.id} has joined`)
  
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
