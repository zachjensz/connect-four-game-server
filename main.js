require("dotenv").config()
const { v4: uuid } = require("uuid")
const bcrypt = require("bcrypt")
const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const db = require("./db.js").db
const {
  authorizeToken,
  setAuthToken,
  generateAccessToken,
  generateRefreshToken,
} = require("./helper.js")

const app = express()
app.use(express.json())
app.use(cors({ origin: true }))

// Database
console.log(db.JSON())
db.set("gamesStartedSinceServerStart", 0)
db.set("gamesFinishedSinceServerStart", 0)

const getUsers = () => db.get("users") ?? []

// Get all users
app.get("/users", setAuthToken, authorizeToken, (req, res) => {
  res.json(getUsers())
})

// add a new user
app.post("/join", async (req, res) => {
  try {
    const uid = uuid()
    const password = req.body.password
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = {
      uid,
      name: req.body.name,
      password: hashedPassword,
    }
    const users = getUsers()
    users.push(user)
    db.set("users", users)
    res.status(201).send()
  } catch (error) {
    console.error(error)
    res.status(500).send()
  }
})

// Login
app.post("/login", async (req, res) => {
  const badLogin = "Username or password is incorrect"
  const users = getUsers()
  const user = users.find((user) => (user.name = req.body.name))
  if (user === null) return res.status(400).send(badLogin)
  try {
    const { name, uid } = user
    const payload = {
      name,
      uid,
    }
    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    // Saves the refresh token in the database
    const refreshTokens = db.get("tokens") ?? []
    refreshTokens.push(refreshToken)
    db.set("tokens", refreshTokens)

    console.log("accessToken", accessToken)
    console.log("refreshToken", refreshToken)
    return (await bcrypt.compare(req.body.password, user.password))
      ? res.status(200).json({ accessToken, refreshToken })
      : res.status(400).send(badLogin)
  } catch (error) {
    console.error(error)
    return res.status(500).send()
  }
})

try {
  app.listen(5000)
} catch (error) {
  console.error(error)
}

app.post("/refresh-access", (req, res) => {
  const refreshToken = req.body.token
  if (refreshToken === null) return res.sendStatus(401)
  const refreshTokens = db.get("tokens") ?? []
  if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403)
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, obj) => {
    if (err) return res.sendStatus(403)
    const payload = {
      name: obj.name,
      uid: obj.uid,
    }
    const accessToken = generateAccessToken(payload)
    res.json({ accessToken })
  })
})

app.delete("/logout", setAuthToken, authorizeToken, (req, res) => {
  const { uid: userID } = jwt.decode(req.authToken)

  // // Saves the refresh token in the database
  let refreshTokens = db.get("tokens") ?? []

  // Removes any refresh token associated with this user
  refreshTokens = refreshTokens.filter((token) => {
    const { uid } = jwt.decode(token)
    return uid != userID
  })

  // Save the DB and return response
  db.set("tokens", refreshTokens)
  res.sendStatus(204)
})
