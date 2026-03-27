const { getDriver } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Helper to format room node
const formatRoom = (record) => {
  const node = record.get("r").properties;
  const courses = record.has("courses") ? record.get("courses") : [];
  const occupiedCount = record.has("occupiedCount")
    ? record.get("occupiedCount")
    : 0;

  const totalCapacity =
    node.capacity != null
      ? typeof node.capacity.toNumber === "function"
        ? node.capacity.toNumber()
        : node.capacity
      : 0;

  const currentOccupied =
    typeof occupiedCount.toNumber === "function"
      ? occupiedCount.toNumber()
      : occupiedCount;

  return {
    _id: node.id,
    name: node.name,
    type: node.type,
    capacity: totalCapacity,
    occupiedCount: currentOccupied,
    availableCapacity: totalCapacity - currentOccupied,
    courses: courses
      .filter((c) => c != null)
      .map((c) => ({
        _id: c.properties.id,
        courseCode: c.properties.courseCode,
        courseName: c.properties.courseName,
      })),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
};

// Get all rooms
const getRooms = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (r:Room)
             OPTIONAL MATCH (c:Course)-[:SCHEDULED_IN]->(r)
             OPTIONAL MATCH (s:Student)-[:ENROLLED_IN]->(c)
             WITH r, collect(DISTINCT c) AS courses, count(DISTINCT s) AS occupiedCount
             RETURN r, courses, occupiedCount
             ORDER BY r.createdAt DESC`,
    );
    const rooms = result.records.map(formatRoom);
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Get single room
const getRoom = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `MATCH (r:Room {id: $id})
             OPTIONAL MATCH (c:Course)-[:SCHEDULED_IN]->(r)
             OPTIONAL MATCH (s:Student)-[:ENROLLED_IN]->(c)
             WITH r, collect(DISTINCT c) AS courses, count(DISTINCT s) AS occupiedCount
             RETURN r, courses, occupiedCount`,
      { id: req.params.id },
    );
    if (result.records.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json(formatRoom(result.records[0]));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Create room
const createRoom = async (req, res) => {
  const session = getDriver().session();
  try {
    const { name, type, capacity } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    await session.run(
      `CREATE (r:Room {
                id: $id,
                name: $name,
                type: $type,
                capacity: $capacity,
                createdAt: $now,
                updatedAt: $now
            })`,
      {
        id,
        name,
        type: type || "General",
        capacity: capacity ? parseInt(capacity) : null,
        now,
      },
    );

    const result = await session.run(
      `MATCH (r:Room {id: $id})
             OPTIONAL MATCH (c:Course)-[:SCHEDULED_IN]->(r)
             OPTIONAL MATCH (s:Student)-[:ENROLLED_IN]->(c)
             WITH r, collect(DISTINCT c) AS courses, count(DISTINCT s) AS occupiedCount
             RETURN r, courses, occupiedCount`,
      { id },
    );
    res.status(201).json(formatRoom(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Update room
const updateRoom = async (req, res) => {
  const session = getDriver().session();
  try {
    const { name, type, capacity } = req.body;
    const now = new Date().toISOString();

    const updateResult = await session.run(
      `MATCH (r:Room {id: $id})
             SET r.name = $name,
                 r.type = $type,
                 r.capacity = $capacity,
                 r.updatedAt = $now
             RETURN r`,
      {
        id: req.params.id,
        name,
        type: type || "General",
        capacity: capacity ? parseInt(capacity) : null,
        now,
      },
    );

    if (updateResult.records.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    const result = await session.run(
      `MATCH (r:Room {id: $id})
             OPTIONAL MATCH (c:Course)-[:SCHEDULED_IN]->(r)
             OPTIONAL MATCH (s:Student)-[:ENROLLED_IN]->(c)
             WITH r, collect(DISTINCT c) AS courses, count(DISTINCT s) AS occupiedCount
             RETURN r, courses, occupiedCount`,
      { id: req.params.id },
    );
    res.json(formatRoom(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Delete room
const deleteRoom = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      "MATCH (r:Room {id: $id}) DETACH DELETE r RETURN count(r) AS deleted",
      { id: req.params.id },
    );
    const deleted = result.records[0].get("deleted").toNumber();
    if (deleted === 0) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json({ message: "Room deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

module.exports = {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
};
