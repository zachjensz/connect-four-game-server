const { v4: uuid } = require("uuid")
const bcrypt = require("bcrypt")
const crypto = require('crypto')
const jwt = require("jsonwebtoken")
const db = require("../util/db.js").db
const {
  generateAccessToken,
  generateRefreshToken,
} = require("./helper.js")

const randomBytes = (size) => crypto.randomBytes(size).toString('hex')

const getUsers = () => db.get("users") ?? []

// add a new user
exports.join = async (req, res) => {
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
}

// Login
exports.login = async (req, res) => {
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
}

exports.refreshAccess = (req, res) => {
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
}

exports.logout = (req, res) => {
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
}

// Give the user enough information to start an encrypted session with the server
exports.connect = async (req, res) => {
  // Generate a random uuid and 64 byte key to use for AES
  // The uuid only tells the server which encryption key the client is using
  const uid = uuid()
  const password = randomBytes(64)

  // Save in DB, so socket.io server can use
  

  // Send an uuid and password to the user
  res.json({ uid, password })
}
