const neo4j = require("neo4j-driver");

let driver;

const connectDB = async () => {
  try {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
    );
    const serverInfo = await driver.getServerInfo();
    console.log(`Neo4j Connected: ${serverInfo.address}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const getDriver = () => driver;
const getSession = () =>
  driver.session({ database: process.env.NEO4J_DATABASE || "neo4j" });

module.exports = { connectDB, getDriver, getSession };
