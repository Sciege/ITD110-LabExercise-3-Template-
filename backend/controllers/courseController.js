const { getDriver } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Helper to format course node with enrolled students, teaching faculty, room and department
const formatCourse = (record) => {
  const node = record.get("c").properties;
  const students = record.has("students") ? record.get("students") : [];
  const faculty = record.has("faculty") ? record.get("faculty") : [];
  const room = record.has("room") ? record.get("room") : null;
  const department = record.has("department") ? record.get("department") : null;

  return {
    _id: node.id,
    courseCode: node.courseCode,
    courseName: node.courseName,
    description: node.description,
    credits:
      node.credits != null
        ? typeof node.credits.toNumber === "function"
          ? node.credits.toNumber()
          : node.credits
        : null,
    students: students
      .filter((s) => s != null)
      .map((s) => ({
        _id: s.properties.id,
        studentId: s.properties.studentId,
        name: s.properties.name,
        email: s.properties.email,
      })),
    faculty: faculty
      .filter((f) => f != null)
      .map((f) => ({
        _id: f.properties.id,
        name: f.properties.name,
        department: f.properties.department,
      })),
    room: room
      ? {
          _id: room.properties.id,
          name: room.properties.name,
        }
      : null,
    department: department
      ? {
          _id: department.properties.id,
          name: department.properties.name,
        }
      : null,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
};

const MATCH_COURSE_FULL = `
    MATCH (c:Course)
    OPTIONAL MATCH (s:Student)-[:ENROLLED_IN]->(c)
    OPTIONAL MATCH (f:Faculty)-[:TEACHES]->(c)
    OPTIONAL MATCH (c)-[:SCHEDULED_IN]->(r:Room)
    OPTIONAL MATCH (c)-[:OFFERED_BY]->(d:Department)
    WITH c, collect(DISTINCT s) AS students, collect(DISTINCT f) AS faculty, r AS room, d AS department
    RETURN c, students, faculty, room, department
    ORDER BY c.createdAt DESC`;

const MATCH_COURSE_BY_ID = `
    MATCH (c:Course {id: $id})
    OPTIONAL MATCH (s:Student)-[:ENROLLED_IN]->(c)
    OPTIONAL MATCH (f:Faculty)-[:TEACHES]->(c)
    OPTIONAL MATCH (c)-[:SCHEDULED_IN]->(r:Room)
    OPTIONAL MATCH (c)-[:OFFERED_BY]->(d:Department)
    WITH c, collect(DISTINCT s) AS students, collect(DISTINCT f) AS faculty, r AS room, d AS department
    RETURN c, students, faculty, room, department`;

// Get all courses
const getCourses = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(MATCH_COURSE_FULL);
    const courses = result.records.map(formatCourse);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Get single course
const getCourse = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(MATCH_COURSE_BY_ID, { id: req.params.id });
    if (result.records.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(formatCourse(result.records[0]));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Create course
const createCourse = async (req, res) => {
  const session = getDriver().session();
  try {
    const {
      courseCode,
      courseName,
      description,
      credits,
      roomId,
      departmentId,
    } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    await session.run(
      `CREATE (c:Course {
                id: $id,
                courseCode: $courseCode,
                courseName: $courseName,
                description: $description,
                credits: $credits,
                createdAt: $now,
                updatedAt: $now
            })`,
      {
        id,
        courseCode,
        courseName,
        description: description || "",
        credits: credits ? parseInt(credits) : null,
        now,
      },
    );

    // Create SCHEDULED_IN relationship if roomId provided
    if (roomId) {
      await session.run(
        `MATCH (c:Course {id: $courseId}), (r:Room {id: $roomId})
                 MERGE (c)-[:SCHEDULED_IN]->(r)`,
        { courseId: id, roomId },
      );
    }

    // Create OFFERED_BY relationship if departmentId provided
    if (departmentId) {
      await session.run(
        `MATCH (c:Course {id: $courseId}), (d:Department {id: $departmentId})
                 MERGE (c)-[:OFFERED_BY]->(d)`,
        { courseId: id, departmentId },
      );
    }

    const result = await session.run(MATCH_COURSE_BY_ID, { id });
    res.status(201).json(formatCourse(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Update course
const updateCourse = async (req, res) => {
  const session = getDriver().session();
  try {
    const {
      courseCode,
      courseName,
      description,
      credits,
      roomId,
      departmentId,
    } = req.body;
    const now = new Date().toISOString();

    const updateResult = await session.run(
      `MATCH (c:Course {id: $id})
             SET c.courseCode = $courseCode,
                 c.courseName = $courseName,
                 c.description = $description,
                 c.credits = $credits,
                 c.updatedAt = $now
             RETURN c`,
      {
        id: req.params.id,
        courseCode,
        courseName,
        description: description || "",
        credits: credits ? parseInt(credits) : null,
        now,
      },
    );

    if (updateResult.records.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Update room relationship
    await session.run(
      `MATCH (c:Course {id: $id})-[r:SCHEDULED_IN]->() DELETE r`,
      { id: req.params.id },
    );
    if (roomId) {
      await session.run(
        `MATCH (c:Course {id: $courseId}), (r:Room {id: $roomId})
                 MERGE (c)-[:SCHEDULED_IN]->(r)`,
        { courseId: req.params.id, roomId },
      );
    }

    // Update department relationship
    await session.run(
      `MATCH (c:Course {id: $id})-[r:OFFERED_BY]->() DELETE r`,
      { id: req.params.id },
    );
    if (departmentId) {
      await session.run(
        `MATCH (c:Course {id: $courseId}), (d:Department {id: $departmentId})
                 MERGE (c)-[:OFFERED_BY]->(d)`,
        { courseId: req.params.id, departmentId },
      );
    }

    const result = await session.run(MATCH_COURSE_BY_ID, { id: req.params.id });
    res.json(formatCourse(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Delete course
const deleteCourse = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      "MATCH (c:Course {id: $id}) DETACH DELETE c RETURN count(c) AS deleted",
      { id: req.params.id },
    );
    const deleted = result.records[0].get("deleted").toNumber();
    if (deleted === 0) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
};
