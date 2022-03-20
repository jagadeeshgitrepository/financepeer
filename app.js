const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const bcrypt = require("bcrypt");
const cors = require("cors");
const sqlite3 = require("sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "financepeer.db");
const jwt = require("jsonwebtoken");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(process.env.PORT || 3004, () => {
      console.log("Server Running at http://localhost:3004/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();
const authenticateToken = (request, response, next) => {
  let jwtToken;
  console.log("headers");
  console.log(request.headers);
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  console.log(jwtToken);
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
}; //login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  console.log(request);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.post("/book/", authenticateToken, async (request, response) => {
  response.send(request.body);
});

app.get("/getBooks/", authenticateToken, async (request, response) => {
  const { username } = request;
  console.log(username);
  const booksQuery = `select * from book_data`;
  const tweetsResult = await db.all(booksQuery);
  response.send({ tweetsResult });
});
module.exports = app;
