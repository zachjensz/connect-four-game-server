require("dotenv").config()
const { db } = require("./util/db.js")

// Database
db.set("serverStarts", (db.get("serverStarts") ?? 0) + 1)
db.set("gamesStartedSinceServerStart", 0)
db.set("gamesFinishedSinceServerStart", 0)
console.log(db.JSON())

// Starts the socket server
require('./socket/sockets.js')

// Starts express app and sets routes
require('./express/app.js')
