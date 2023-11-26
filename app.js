const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

//middlrware func

/*
const {username, password} = request.body
  let jwtToken
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid User')
  }else{
    const authHeader = request.headers['authorization']
    if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
  }
  }
*/
const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

//login  api     1

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// get books         api    2

app.get('/states/', authenticateToken, async (request, response) => {
  const getBooksQuery = `
   SELECT
    state_id AS stateId,
    state_name AS stateName,
    population AS population
   FROM
    state
   ORDER BY
    state_id;`
  const booksArray = await db.all(getBooksQuery)
  response.send(booksArray)
})

//GET BOOKS          api     3

app.get('/states/:stateId/', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getBooksQuery = `
   SELECT
    state_id AS stateId,
    state_name AS stateName,
    population AS population
   FROM
    state
    WHERE state_id=${stateId};`
  const booksArray = await db.get(getBooksQuery)
  response.send(booksArray)
})

//post     api 4

app.post('/districts/', authenticateToken, async (request, response) => {
  const bookDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = bookDetails
  const addBookQuery = `
    INSERT INTO
      district (district_name,state_id,cases,cured,active,deaths)
    VALUES
      (
        '${districtName}',
         ${stateId},
         ${cases},
         ${cured},
         ${active},
        ${deaths}
      );`

  await db.run(addBookQuery)
  response.send('District Successfully Added')
})

//get district   api 5

app.get(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getBooksQuery = `
   SELECT
   district_id AS districtId,
   district_name AS districtName,
   state_id AS stateId,
   cases AS cases,
   cured AS cured,
   active AS active,
   deaths AS deaths
   FROM
    district
    WHERE district_id=${districtId};`
    const booksArray = await db.get(getBooksQuery)
    response.send(booksArray)
  },
)

//  delete   api    6

app.delete(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getBooksQuery = `
   DELETE FROM
    district
    WHERE district_id=${districtId};`
    await db.run(getBooksQuery)
    response.send('District Removed')
  },
)

// put api   7

app.put(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const bookDetails = request.body
    const {districtName, stateId, cases, cured, active, deaths} = bookDetails
    const updateBookQuery = `
    UPDATE
      district
    SET
      district_name='${districtName}',
      state_id=${stateId},
      cases=${cases},
      cured=${cured},
      active	=${active},
      deaths=${deaths}
    WHERE
      district_id = ${districtId};`
    await db.run(updateBookQuery)
    response.send('District Details Updated')
  },
)

// get api    8
app.get(
  '/states/:stateId/stats/',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    const getBooksQuery = `
   SELECT
   SUM(cases) AS totalCases,
   SUM(cured) AS totalCured,
   SUM(active) AS totalActive,
   SUM(deaths) AS totalDeaths
   FROM
    district
    WHERE state_id = ${stateId};`
    const booksArray = await db.get(getBooksQuery)
    response.send(booksArray)
  },
)
module.exports = app
