const db = require("./db.js").db
//const secrets = require("./secrets.json")

const bcrypt = require("bcrypt")
const express = require("express")
const cors = require("cors")

const app = express()
app.use(express.json())

// Setup cors
app.use(cors({ origin: true }))

// For JWT https://youtu.be/mbsmsi7l3r4?t=361
// app.use(express.json())

const setAuthToken = async (req, _, next) => {
  const authHeader = req.header("Authorization")
  const authHeaderTokens = authHeader ? authHeader.split(" ") : ["", ""]
  const token =
    authHeaderTokens[0] === "Bearer" ? authHeaderTokens[1] : undefined

  req.authToken = token

  return next()
}

const authenticateToken = async (req, res, next) => {
  // Require authentication
  if (!req.authToken) return res.status(401).send()

  const token = secrets?.ACCESS_TOKEN_SECRET ?? "abc123"
  return jwt.verify(req.authToken, token, (err, user) => {
    if (err) return res.status(403).send()
    req.user = user
    return next()
  })
}

// Get a single user
app.get("/:id", setAuthToken, authenticateToken, async (req, res) => {
  const snapshot = await collection.doc(req.params.id).get()
  const data = snapshot.data()
  if (data) {
    // return the user's information
    return res.status(200).json({ [`${snapshot.id}`]: data })
  } else {
    // User not found
    return res.status(404).send()
  }
})

// Get all users
app.get("/", setAuthToken, authenticateToken, async (req, res) => {
  const snapshot = await collection.get()
  // Build an array of all user data
  let users = []
  if (snapshot) {
    snapshot.forEach((doc) => {
      let id = doc.id
      if (minimizeGetAll) {
        users.push(id)
      } else {
        let data = doc.data()
        users.push({ [`${id}`]: data })
      }
    })
  }
  return res.status(200).json(users)
})

// Add a user
app.post("/", setAuthToken, authenticateToken, async (req, res) => {
  const postData = req.body
  if (!postData) return res.status(400).send()

  // Forbidden to add the admin claim via this api
  if (postData?.claims?.admin)
    return res
      .status(403)
      .send("Adding the admin token via this API is prohibited")

  // Create the user's information doc
  let doc = await collection.add(postData)

  // Create a custom auth token using the ID of the doc as the user's id
  // If a claims field is specified, those claims are included here
  return admin
    .auth()
    .createCustomToken(doc.id, postData.claims)
    .then((customToken) => {
      postData.id = doc.id
      postData.customToken = customToken
      return res.status(201).json(postData)
    })
    .catch((error) =>
      res
        .status(500)
        .json({ error, exception: "Exception creating custom token" })
        .send()
    )
})

// Update a user
app.put("/:id", setAuthToken, authenticateToken, async (req, res) => {
  const putData = req.body
  const doc = collection.doc(req.params.id)
  const snapshot = await doc.get()
  const data = snapshot.data()
  if (req.params.id.length > 20 || !putData || !data) {
    // Not Found
    return res.status(404).send()
  }

  // Reset any attempt to alter this value!!!
  putData.customToken = data.customToken

  // No claims were changed so no new custom auth token needs to be generated
  if (!putData.claims) {
    // Update user information
    await doc.update(putData)

    // OK
    return res.status(200).json(putData)
  }

  // Forbidden to add the admin claim via this api
  if (putData?.claims?.admin)
    return res
      .status(403)
      .send("Adding the admin token via this API is prohibited")

  // I think I need to remove the old user's auth account to accept the new claims
  // When they log back in they will have the same UID and all, just different claims.
  // ...
  // Create a new custom auth token using the ID of the doc as the user's id
  // If a claims field is specified, those claims are included here

  // Delete the old user in Firebase, then user logs in with this token to recreate that Firebase
  // auth user with the new claims

  return admin
    .auth()
    .createCustomToken(doc.id, putData.claims)
    .then((customToken) => {
      putData.id = doc.id
      putData.customToken = customToken
      return res.status(200).json(putData)
    })
    .catch((error) =>
      res
        .status(500)
        .json({ error, exception: "Exception creating custom token" })
        .send()
    )
})

// Delete a user
app.delete("/:id", setAuthToken, authenticateToken, async (req, res) => {
  if (req.params.id.length > 20) {
    // This could be a regular authentication-method user id, not created with the REST API
    // Not Found
    return res.status(404).send()
  }
  const doc = collection.doc(req.params.id)
  if ((await doc.get()).exists) {
    // Delete authentication if it exists
    // If the user never logged in, there will be no authentication to delete
    admin
      .auth()
      .deleteUser(doc.id)
      .catch(() => {})
    // Delete the Firestore document for this user
    await doc.delete()
    // OK
    return res.status(200).send()
  } else {
    // User not found
    return res.status(404).send()
  }
})

app.listen(3000)