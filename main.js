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
    const hashedPassword = await bcrypt.hash(password, 10)
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

app.post("/users/login", async (req, res) => {
  const badLogin = 'Username or password is incorrect'
  const users = getUsers()
  const user = users.find((user) => user.name = req.body.name)
  if (user === null)
    return res.status(400).send(badLogin)
  try {
    return (await bcrypt.compare(req.body.password, user.password)) ? 
      res.status(200).send("Login approved") :
      res.status(400).send(badLogin)
  } catch {
    return res.status(500).send()
  }
})

try {
  app.listen(5000)
} catch (error) {
  console.error(error)
}
