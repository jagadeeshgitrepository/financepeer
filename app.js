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
    response.send({ error_msg: "Invalid User" });
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
      response.send({ error_msg: "Invalid Password" });
    }
  }
});

app.post("/book/", authenticateToken, async (request, response) => {
  const bookDetails = request.body;
  console.log(bookDetails);
  // let us assume we have the table named book with title, author_id, and rating as columns
  const values = bookDetails.map(
    (eachBook) =>
      `(${eachBook.userId}, ${eachBook.id}, '${eachBook.title}', '${eachBook.body}')`
  );

  const valuesString = values.join(",");

  const addBookQuery = `
    INSERT INTO
      book_data(userId,id,title,body)
    VALUES
       ${valuesString};`;

  const dbResponse = await db.run(addBookQuery);
  const bookId = dbResponse.lastID;

  response.send({ bookId: bookId });
});

app.get("/getBooks/", authenticateToken, async (request, response) => {
  const { username } = request;
  console.log(username);
  const booksQuery = `select * from book_data`;
  const tweetsResult = await db.all(booksQuery);
  response.send({ tweetsResult });
});
module.exports = app;
