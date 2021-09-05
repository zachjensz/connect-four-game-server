const express = require("express")
const cors = require("cors")
const routes = require("./routes.js")

const {
  authorizeToken,
  setAuthToken,
} = require("./helper.js")

const app = express()
app.use(express.json())
app.use(cors({ origin: true }))

// add a new user
app.post("/join", routes.join)

// Login
app.post("/login", routes.login)

// Refresh JWT
app.post("/refresh-access", routes.refreshAccess)

// Logout
app.delete("/logout", setAuthToken, authorizeToken, routes.logout)

// Give the user the information needed to start an encrypted
// session with the socket server
app.post("/connect", setAuthToken, authorizeToken, routes.connect)

// Start Server
try {
  app.listen(5000)
} catch (error) {
  console.error(error)
}

exports.app = app