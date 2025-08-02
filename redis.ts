import { Redis } from "ioredis";
import { config } from "./src/config";

const redis = new Redis({
  host: config.redisHost,
  port: config.redisPort,
  db: config.redisDatabaseIndex,
});

export default redis;
