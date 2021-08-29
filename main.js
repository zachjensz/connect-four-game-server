const db = require("./db.js").db

const bcrypt = require("bcrypt")
const express = require("express")
const app = express()
app.use(express.json())

// Database 
console.log(db.JSON())
db.set('gamesStartedSinceServerStart', 0)
db.set('gamesFinishedSinceServerStart', 0)

const getUsers = () => db.get("users") ?? []

app.get("/users", (req, res) => {
  res.json(getUsers())
})

app.post("/users", async (req, res) => {
  try {
    const password = req.body.password
    const salt = await bcrypt.genSalt()
    const hashedPassword = await bcrypt.hash(password, salt)
    const user = {
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

app.listen(3000)
