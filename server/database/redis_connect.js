// const redis = require("redis")
// const express = require('express')
// const app = express()
// const session = require("express-session")
// let RedisStore = require('connect-redis')(session)
// //  port: 6379,host: 'redis'

// let client = redis.createClient({ url: 'redis://redis:6379'  })

// client.on('error', (err) => console.log('Redis Client Error', err));
// client.connect()

// app.use(session({
//     store: new RedisStore({ client }),
//     saveUninitialized: true,
//     secret: "secret",
//     resave: false
// })
// )


// module.exports = client;

