import express, { Express, Request, Response } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import websockets from "./websockets";
import cron from "node-cron";
import axios from 'axios';
import * as os from "os";

const connectionString = `mongodb+srv://${process.env?.MONGO_USERNAME}:${process.env?.MONGO_PASSWORD}@cluster0.0tkabxq.mongodb.net/`;

let db: any;

const app: Express = express();
app.use(cors());
// const host = process.env.HOST || "localhost";
const host = process.env?.DEPLOY_ENV === "local" ? "localhost" : "connect-4-backend-6rkt.onrender.com";
const port = process?.env?.PORT || 3001;
const protocol = host === "localhost" ? "http" : "https";
const baseUrl = `${protocol}://${host}${host === "localhost" ? ":" + port : ""}`;
const uiUrl = host === "localhost" ? "http://localhost:3000" : "https://connect-4-ui.onrender.com/";

console.info(`[server] - Server URL is: ${baseUrl}`);
console.info(`[server] - UI URL is: ${uiUrl}`);
console.info(`[server] - Server starting on port: ${port}`);


const healthData = {
  dbConnected: false,
  websocketsConnected: false,
}

app.get("/health", async (req: Request, res: Response) => {
  console.debug("[server] - hit health check");
  res.send(healthData).status(200);
});

app.get("/check-user/:userName", async (req: Request, res: Response) => {
  console.debug(`[server] - hit check user with username: ${req.params.userName}`);

  const userName = req.params.userName;
  let collection = await db.collection("active_players");
  let results = await collection.find({ userName }).limit(1).toArray();
  // console.log("fetched data is: ", results);

  res.send(Boolean(results.length)).status(200);
});

app.get("/room-exists/:roomName", async (req: Request, res: Response) => {
  console.debug(`[server] - hit check room with roomName: ${req.params.roomName}`);
  const roomName = req.params.roomName;
  let collection = await db.collection("active_games");
  let results = await collection.find({ roomName }).limit(1).toArray();
  console.log("fetched data is: ", results);

  res.send(Boolean(results.length)).status(200);
});

const server = app.listen(port, () => {
  console.log(
      `[server]: Server is running`
  );
});

const connectDatabaseStartWebsocket = async () => {
  try {
    const client = new MongoClient(connectionString);
    const connectionObject = await client.connect();
    db = connectionObject.db("connect-x");
    healthData.dbConnected = true;
    console.info("[server] - Connected to the database");
  } catch (e) {
      console.error("[server] - Error connecting to database: ", e);
  }
  try {
    websockets(server, db);
    healthData.websocketsConnected = true;
  } catch (e) {
    console.error("[server] - ERROR IS: ", e);
  }
}

connectDatabaseStartWebsocket();


cron.schedule("*/1 * * * *", () => {
  console.log("[server] - running cron job");
  axios.get(`${baseUrl}/health`)
      .then((res) => {
        console.log(`[server] - Cron health check status: ${res.status}`);
      }).catch((err) => {
    console.log(`[server] - Error on cron health check: ${err.message}`);
  });

  axios.get(uiUrl)
      .then((res) => {
        console.log(`[server] - Cron health UI check status: ${res.status}`);
      }).catch((err) => {
    console.log(`[server] - Error on cron UI check: ${err.message}`);
  });
});
