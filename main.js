const fs = require("fs")
const socket = require("socket.io")

const setSavedState = (state) => {
  fs.writeFile("server.db", JSON.stringify(state), function (err) {
    if (err) {
      return console.error(err)
    }
    console.log("Server state written successfully!")
  })
}

const getSavedState = () => {
  fs.readFile("server.db", function (err, data) {
    if (err) {
      return console.error(err)
    }
    return JSON.parse(data)
  })
}

let dbData = getSavedState() ?? {
  test: 'Hello DB'
}
dbData['save'] = () => setSavedState(dbData)
dbData.save()

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
const removeSocketById = (id) => clientSockets.filter((ele) => ele.id != socket.id)

// Games in-progress
const gamesBeingPlayed = []

function removeFromLookingFor(socketId) {
  lookingForOpponents =
    lookingForOpponents.filter((ele) => ele != socketId)
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
      socket.emit("opponent-found", { id: opponentId, startingPlayer: !!startingPlayer })
      opponentSocket.emit("opponent-found", {id: socket.id, startingPlayer: !startingPlayer })
      gamesBeingPlayed.push({
        startingPlayer,
        opponentId,
        opponentSocket,
        socket
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

