const { getDriver } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Helper to format a Neo4j student node with enrolled courses and department
const formatStudent = (record) => {
  const node = record.get("s").properties;
  const courses = record.has("courses") ? record.get("courses") : [];
  const department = record.has("department") ? record.get("department") : null;

  return {
    _id: node.id,
    studentId: node.studentId,
    name: node.name,
    email: node.email,
    department: department
      ? {
          _id: department.properties.id,
          name: department.properties.name,
        }
      : null,
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

const MATCH_STUDENT_FULL = `
    MATCH (s:Student)
    OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Course)
    OPTIONAL MATCH (s)-[:BELONGS_TO]->(d:Department)
    WITH s, collect(DISTINCT c) AS courses, d AS department
    RETURN s, courses, department
    ORDER BY s.createdAt DESC`;

const MATCH_STUDENT_BY_ID = `
    MATCH (s:Student {id: $id})
    OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Course)
    OPTIONAL MATCH (s)-[:BELONGS_TO]->(d:Department)
    WITH s, collect(DISTINCT c) AS courses, d AS department
    RETURN s, courses, department`;

// Get all students
const getStudents = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(MATCH_STUDENT_FULL);
    const students = result.records.map(formatStudent);
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Get single student
const getStudent = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(MATCH_STUDENT_BY_ID, { id: req.params.id });
    if (result.records.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(formatStudent(result.records[0]));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Create student
const createStudent = async (req, res) => {
  const session = getDriver().session();
  try {
    const { studentId, name, email, departmentId, courses } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    await session.run(
      `CREATE (s:Student {
                id: $id,
                studentId: $studentId,
                name: $name,
                email: $email,
                createdAt: $now,
                updatedAt: $now
            })`,
      { id, studentId, name, email, now },
    );

    // Create BELONGS_TO relationship if departmentId provided
    if (departmentId) {
      await session.run(
        `MATCH (s:Student {id: $studentId}), (d:Department {id: $departmentId})
                 MERGE (s)-[:BELONGS_TO]->(d)`,
        { studentId: id, departmentId },
      );
    }

    // Create ENROLLED_IN relationships if courses provided
    if (courses && courses.length > 0) {
      await session.run(
        `MATCH (s:Student {id: $studentId})
                 UNWIND $courseIds AS courseId
                 MATCH (c:Course {id: courseId})
                 MERGE (s)-[:ENROLLED_IN]->(c)`,
        { studentId: id, courseIds: courses },
      );
    }

    const result = await session.run(MATCH_STUDENT_BY_ID, { id });
    res.status(201).json(formatStudent(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Update student
const updateStudent = async (req, res) => {
  const session = getDriver().session();
  try {
    const { studentId, name, email, departmentId, courses } = req.body;
    const now = new Date().toISOString();

    const updateResult = await session.run(
      `MATCH (s:Student {id: $id})
             SET s.studentId = $studentId,
                 s.name = $name,
                 s.email = $email,
                 s.updatedAt = $now
             RETURN s`,
      { id: req.params.id, studentId, name, email, now },
    );
    if (updateResult.records.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Update department relationship
    await session.run(`MATCH (s:Student {id: $id})-[r:BELONGS_TO]->() DELETE r`, {
      id: req.params.id,
    });
    if (departmentId) {
      await session.run(
        `MATCH (s:Student {id: $studentId}), (d:Department {id: $departmentId})
                 MERGE (s)-[:BELONGS_TO]->(d)`,
        { studentId: req.params.id, departmentId },
      );
    }

    // Remove old ENROLLED_IN relationships and create new ones
    await session.run(
      `MATCH (s:Student {id: $id})-[r:ENROLLED_IN]->() DELETE r`,
      { id: req.params.id },
    );

    if (courses && courses.length > 0) {
      await session.run(
        `MATCH (s:Student {id: $studentId})
                 UNWIND $courseIds AS courseId
                 MATCH (c:Course {id: courseId})
                 MERGE (s)-[:ENROLLED_IN]->(c)`,
        { studentId: req.params.id, courseIds: courses },
      );
    }

    const result = await session.run(MATCH_STUDENT_BY_ID, {
      id: req.params.id,
    });
    res.json(formatStudent(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      "MATCH (s:Student {id: $id}) DETACH DELETE s RETURN count(s) AS deleted",
      { id: req.params.id },
    );
    const deleted = result.records[0].get("deleted").toNumber();
    if (deleted === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
};
