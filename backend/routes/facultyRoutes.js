const express = require("express");
const router = express.Router();
const {
  getFaculties,
  getFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
} = require("../controllers/facultyController");

router.route("/").get(getFaculties).post(createFaculty);

router.route("/:id").get(getFaculty).put(updateFaculty).delete(deleteFaculty);

module.exports = router;
