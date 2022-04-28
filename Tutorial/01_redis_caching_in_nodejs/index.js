import express from "express";
import fetch from "node-fetch";
import redis from "redis";

const app = express();
const PORT = process.env.PORT || 8080;
const REDIS_PORT = process.env.REDIS_PORT || 6379;
// we also have to define the redis port

const client = redis.createClient(REDIS_PORT);
await client.connect();
// creating redis client and connecting to redis server
// NOTE: redis server need to up on running to connect to it

app.get("/", (req, res) => {
  res.send("hello");
});

// Set response:
const setResponse = (username, repos) => {
  return `<h2>${username} has ${repos} Github repos</h2>`;
};

// Make request to Github for data
async function getRepos(req, res, next) {
  try {
    console.log("Fetching Data...");
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();
    const repos = data.public_repos;
    // Completed Getting Github User data

    // Implementing Redis
    // setting data on redis
    client.setEx(username, 3600, repos);
    res.send(setResponse(username, repos));
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

// Cache middleware
const cache = (req, res, next) => {
  const { username } = req.params;
  client
    .get(username)
    .then((data) => {
      //   we will get the value by providing key
      if (data !== null) {
        // if value exist then we will response to client
        res.send(setResponse(username, data));
      } else {
        // if value doesn't exist then we will move to next() 'getRepos()' function
        next();
      }
    })
    .catch((err) => {
      throw err;
    });
};

app.get("/repos/:username", cache, getRepos);

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
