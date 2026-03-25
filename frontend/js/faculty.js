const API_URL = "http://localhost:5001/api/faculty";
const COURSES_API_URL = "http://localhost:5001/api/courses";

const form = document.getElementById("faculty-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const facultyIdInput = document.getElementById("faculty-id");
const nameInput = document.getElementById("name");
const addressInput = document.getElementById("address");
const departmentInput = document.getElementById("department");
const coursesSelect = document.getElementById("courses");
const tbody = document.getElementById("faculty-tbody");
const noFacultyMsg = document.getElementById("no-faculty");

let isEditing = false;
let allCourses = [];

document.addEventListener("DOMContentLoaded", async () => {
  await fetchCoursesForSelect();
  await fetchFaculties();
});

form.addEventListener("submit", handleSubmit);
cancelBtn.addEventListener("click", resetForm);

async function fetchCoursesForSelect() {
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

async function fetchFaculties() {
  try {
    const response = await fetch(API_URL);
    const faculties = await response.json();
    renderFaculties(faculties);
  } catch (error) {
    console.error("Error fetching faculty:", error);
  }
}

function renderFaculties(faculties) {
  tbody.innerHTML = "";

  if (faculties.length === 0) {
    noFacultyMsg.classList.remove("hidden");
    return;
  }

  noFacultyMsg.classList.add("hidden");

  faculties.forEach((faculty) => {
    const row = document.createElement("tr");
    const courseNames =
      faculty.courses && faculty.courses.length > 0
        ? faculty.courses
            .map((c) => escapeHtml(`${c.courseCode} - ${c.courseName}`))
            .join(", ")
        : "-";
    row.innerHTML = `
            <td>${escapeHtml(faculty.name)}</td>
            <td>${escapeHtml(faculty.address)}</td>
            <td>${escapeHtml(faculty.department)}</td>
            <td>${courseNames}</td>
            <td>
                <button class="btn-edit" onclick="editFaculty('${faculty._id}')">Edit</button>
                <button class="btn-delete" onclick="deleteFaculty('${faculty._id}')">Delete</button>
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

  const facultyData = {
    name: nameInput.value.trim(),
    address: addressInput.value.trim(),
    department: departmentInput.value.trim(),
    courses: getSelectedCourses(),
  };

  try {
    if (isEditing) {
      await fetch(`${API_URL}/${facultyIdInput.value}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facultyData),
      });
    } else {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facultyData),
      });
    }

    resetForm();
    fetchFaculties();
  } catch (error) {
    console.error("Error saving faculty:", error);
  }
}

async function editFaculty(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const faculty = await response.json();

    facultyIdInput.value = faculty._id;
    nameInput.value = faculty.name;
    addressInput.value = faculty.address;
    departmentInput.value = faculty.department;

    const courseIds = faculty.courses ? faculty.courses.map((c) => c._id) : [];
    populateCourseSelect(courseIds);

    isEditing = true;
    formTitle.textContent = "Edit Faculty";
    submitBtn.textContent = "Update Faculty";
    cancelBtn.classList.remove("hidden");

    nameInput.focus();
  } catch (error) {
    console.error("Error fetching faculty:", error);
  }
}

async function deleteFaculty(id) {
  if (!confirm("Are you sure you want to delete this faculty member?")) {
    return;
  }

  try {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    fetchFaculties();
  } catch (error) {
    console.error("Error deleting faculty:", error);
  }
}

function resetForm() {
  form.reset();
  facultyIdInput.value = "";
  isEditing = false;
  formTitle.textContent = "Add New Faculty";
  submitBtn.textContent = "Add Faculty";
  cancelBtn.classList.add("hidden");
  populateCourseSelect([]);
}
