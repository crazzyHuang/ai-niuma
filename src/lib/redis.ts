import { createClient } from 'redis';

const redisClientSingleton = () => {
  return createClient({ url: process.env.REDIS_URL });
};

declare global {
  var redis: undefined | ReturnType<typeof redisClientSingleton>;
}

const redis = globalThis.redis ?? redisClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.redis = redis;

// It's good practice to handle connection errors.
redis.on('error', (err) => console.log('Redis Client Error', err));

// You might need to connect explicitly depending on your usage pattern.
// await redis.connect();

export default redis;