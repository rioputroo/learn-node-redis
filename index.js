import express from "express";
import fetch from "node-fetch";
import { createClient } from "redis";

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const app = express();

var client = null;

// Set response
function setResponse(username, repos) {
  return `<h2>${username} has ${repos} Github repos</h2>`;
}

async function setupRedis() {
  client = createClient();

  client.on("error", (err) => console.log("Redis Client Error", err));

  await client.connect();

//   await client.set("key", "value");
//   const value = await client.get("key");
};

// Make request to github for data
async function getRepos(req, res, next) {
  try {
    console.log("Fetching data...");

    const { username } = req.params;

    const response = await fetch(`https://api.github.com/users/${username}`);

    const data = await response.json();

    const repos = data.public_repos;

    // Set data to redis
    await client.SETEX(username, 3600, repos);

    res.send(setResponse(username, repos));
  } catch (error) {
    console.error(error);
  }
}

// Cache middleware
async function cache(req, res, next) {
  const { username } = req.params;

  const value = await client.get(username);

  if (value) {
    res.send(setResponse(username, value));
  } else {
    next();
  }

//   await client.get(username, (err, data) => {
//     if (err) throw err;

//     if (data !== null) {
//       res.send(setResponse(username, data));
//     } else {
//       next();
//     }
//   });
}

setupRedis();

app.get("/repos/:username", cache, getRepos);

app.listen(5000, () => {
  console.log(`Listening on port 5000`);
});
