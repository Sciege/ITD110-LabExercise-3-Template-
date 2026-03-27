const { getDriver } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Helper to format department node
const formatDepartment = (record) => {
  const node = record.get("d").properties;
  const faculty = record.has("faculty") ? record.get("faculty") : [];
  const courses = record.has("courses") ? record.get("courses") : [];

  return {
    _id: node.id,
    name: node.name,
    description: node.description,
    faculty: faculty
      .filter((f) => f != null)
      .map((f) => ({
        _id: f.properties.id,
        name: f.properties.name,
      })),
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

const MATCH_DEPARTMENT_FULL = `
    MATCH (d:Department)
    OPTIONAL MATCH (f:Faculty)-[:BELONGS_TO]->(d)
    OPTIONAL MATCH (c:Course)-[:OFFERED_BY]->(d)
    WITH d, collect(DISTINCT f) AS faculty, collect(DISTINCT c) AS courses
    RETURN d, faculty, courses
    ORDER BY d.createdAt DESC`;

const MATCH_DEPARTMENT_BY_ID = `
    MATCH (d:Department {id: $id})
    OPTIONAL MATCH (f:Faculty)-[:BELONGS_TO]->(d)
    OPTIONAL MATCH (c:Course)-[:OFFERED_BY]->(d)
    WITH d, collect(DISTINCT f) AS faculty, collect(DISTINCT c) AS courses
    RETURN d, faculty, courses`;

// Get all departments
const getAllDepartments = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(MATCH_DEPARTMENT_FULL);
    const departments = result.records.map(formatDepartment);
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Get single department
const getDepartment = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(MATCH_DEPARTMENT_BY_ID, {
      id: req.params.id,
    });
    if (result.records.length === 0) {
      return res.status(404).json({ message: "Department not found" });
    }
    res.json(formatDepartment(result.records[0]));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Create department
const createDepartment = async (req, res) => {
  const session = getDriver().session();
  try {
    const { name, description } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    await session.run(
      `CREATE (d:Department {
                id: $id,
                name: $name,
                description: $description,
                createdAt: $now,
                updatedAt: $now
            })`,
      { id, name, description: description || "", now },
    );

    const result = await session.run(MATCH_DEPARTMENT_BY_ID, { id });
    res.status(201).json(formatDepartment(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Update department
const updateDepartment = async (req, res) => {
  const session = getDriver().session();
  try {
    const { name, description } = req.body;
    const now = new Date().toISOString();

    const updateResult = await session.run(
      `MATCH (d:Department {id: $id})
             SET d.name = $name,
                 d.description = $description,
                 d.updatedAt = $now
             RETURN d`,
      { id: req.params.id, name, description: description || "", now },
    );

    if (updateResult.records.length === 0) {
      return res.status(404).json({ message: "Department not found" });
    }

    const result = await session.run(MATCH_DEPARTMENT_BY_ID, {
      id: req.params.id,
    });
    res.json(formatDepartment(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Delete department
const deleteDepartment = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      "MATCH (d:Department {id: $id}) DETACH DELETE d RETURN count(d) AS deleted",
      { id: req.params.id },
    );
    const deleted = result.records[0].get("deleted").toNumber();
    if (deleted === 0) {
      return res.status(404).json({ message: "Department not found" });
    }
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

module.exports = {
  getAllDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
