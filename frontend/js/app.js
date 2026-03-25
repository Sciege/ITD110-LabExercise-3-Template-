const API_URL = "http://localhost:5001/api/students";
const COURSES_API_URL = "http://localhost:5001/api/courses";

const form = document.getElementById("student-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const studentIdInput = document.getElementById("student-id");
const studentIdFieldInput = document.getElementById("student-id-field");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const coursesSelect = document.getElementById("courses");
const tbody = document.getElementById("students-tbody");
const noStudentsMsg = document.getElementById("no-students");

let isEditing = false;
let allCourses = [];

document.addEventListener("DOMContentLoaded", async () => {
  await fetchCourses();
  await fetchStudents();
});

form.addEventListener("submit", handleSubmit);
cancelBtn.addEventListener("click", resetForm);

async function fetchCourses() {
  try {
    const response = await fetch(COURSES_API_URL);
    allCourses = await response.json();
    populateCourseSelect();
  } catch (error) {
    console.error("Error fetching courses:", error);
  }
}

function populateCourseSelect(selectedIds = []) {
  coursesSelect.innerHTML = "";
  allCourses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course._id;
    option.textContent = `${course.courseCode} - ${course.courseName}`;
    if (selectedIds.includes(course._id)) {
      option.selected = true;
    }
    coursesSelect.appendChild(option);
  });
}

function getSelectedCourses() {
  const selected = [];
  for (const option of coursesSelect.options) {
    if (option.selected) {
      selected.push(option.value);
    }
  }
  return selected;
}

async function fetchStudents() {
  try {
    const response = await fetch(API_URL);
    const students = await response.json();
    renderStudents(students);
  } catch (error) {
    console.error("Error fetching students:", error);
  }
}

function renderStudents(students) {
  tbody.innerHTML = "";

  if (students.length === 0) {
    noStudentsMsg.classList.remove("hidden");
    return;
  }

  noStudentsMsg.classList.add("hidden");

  students.forEach((student) => {
    const row = document.createElement("tr");
    const courseNames =
      student.courses && student.courses.length > 0
        ? student.courses
            .map((c) => escapeHtml(`${c.courseCode} - ${c.courseName}`))
            .join(", ")
        : "-";
    row.innerHTML = `
            <td>${escapeHtml(student.studentId || "-")}</td>
            <td>${escapeHtml(student.name)}</td>
            <td>${escapeHtml(student.email)}</td>
            <td>${courseNames}</td>
            <td>
                <button class="btn-edit" onclick="editStudent('${student._id}')">Edit</button>
                <button class="btn-delete" onclick="deleteStudent('${student._id}')">Delete</button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function handleSubmit(e) {
  e.preventDefault();

  const studentData = {
    studentId: studentIdFieldInput.value.trim(),
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    courses: getSelectedCourses(),
  };

  try {
    if (isEditing) {
      await fetch(`${API_URL}/${studentIdInput.value}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
      });
    } else {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
      });
    }

    resetForm();
    fetchStudents();
  } catch (error) {
    console.error("Error saving student:", error);
  }
}

async function editStudent(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const student = await response.json();

    studentIdInput.value = student._id;
    studentIdFieldInput.value = student.studentId || "";
    nameInput.value = student.name;
    emailInput.value = student.email;

    const courseIds = student.courses ? student.courses.map((c) => c._id) : [];
    populateCourseSelect(courseIds);

    isEditing = true;
    formTitle.textContent = "Edit Student";
    submitBtn.textContent = "Update Student";
    cancelBtn.classList.remove("hidden");

    studentIdFieldInput.focus();
  } catch (error) {
    console.error("Error fetching student:", error);
  }
}

async function deleteStudent(id) {
  if (!confirm("Are you sure you want to delete this student?")) {
    return;
  }

  try {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    fetchStudents();
  } catch (error) {
    console.error("Error deleting student:", error);
  }
}

function resetForm() {
  form.reset();
  studentIdInput.value = "";
  isEditing = false;
  formTitle.textContent = "Add New Student";
  submitBtn.textContent = "Add Student";
  cancelBtn.classList.add("hidden");
  populateCourseSelect([]);
}
