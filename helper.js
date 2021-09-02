const jwt = require("jsonwebtoken")

exports.setAuthToken = async (req, _, next) => {
  const authHeader = req.header("Authorization")
  const authHeaderTokens = authHeader ? authHeader.split(" ") : ["", ""]
  const token =
    authHeaderTokens[0] === "Bearer" ? authHeaderTokens[1] : undefined

  req.authToken = token

  return next()
}

exports.authorizeToken = async (req, res, next) => {
  // Require authentication
  if (!req.authToken) return res.status(401).send()

  return jwt.verify(
    req.authToken,
    process.env.ACCESS_TOKEN_SECRET,
    (err, user) => {
      if (err) return res.status(403).send()
      req.user = user
      return next()
    }
  )
}

exports.generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "10m",
  })
}

exports.generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET)
}
