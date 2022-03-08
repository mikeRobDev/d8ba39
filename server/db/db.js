const Sequelize = require("sequelize");

/*const db = new Sequelize(process.env.DATABASE_URL || "postgres://localhost:5432/messenger", {
  logging: false
});*/

//change to environment variable once windows error solution is found
const db = new Sequelize("messenger", "postgres", "HatchTrack22!", {
  host: "localhost",
  port: "5432",
  dialect: 'postgres',
  logging: false
});


module.exports = db;
