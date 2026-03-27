const API_URL = "http://localhost:5001/api/departments";

const form = document.getElementById("department-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const departmentIdInput = document.getElementById("department-id");
const nameInput = document.getElementById("name");
const descriptionInput = document.getElementById("description");
const tbody = document.getElementById("department-tbody");
const noDepartmentsMsg = document.getElementById("no-departments");

let isEditing = false;

document.addEventListener("DOMContentLoaded", fetchDepartments);

form.addEventListener("submit", handleSubmit);
cancelBtn.addEventListener("click", resetForm);

async function fetchDepartments() {
  try {
    const response = await fetch(API_URL);
    const departments = await response.json();
    renderDepartments(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
  }
}

function renderDepartments(departments) {
  tbody.innerHTML = "";

  if (departments.length === 0) {
    noDepartmentsMsg.classList.remove("hidden");
    return;
  }

  noDepartmentsMsg.classList.add("hidden");

  departments.forEach((department) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${escapeHtml(department.name)}</td>
            <td class="col-description">${escapeHtml(department.description || "-")}</td>
            <td>
                <button class="btn-edit" onclick="editDepartment('${department._id}')">Edit</button>
                <button class="btn-delete" onclick="deleteDepartment('${department._id}')">Delete</button>
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

  const departmentData = {
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim(),
  };

  try {
    if (isEditing) {
      await fetch(`${API_URL}/${departmentIdInput.value}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(departmentData),
      });
    } else {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(departmentData),
      });
    }

    resetForm();
    fetchDepartments();
  } catch (error) {
    console.error("Error saving department:", error);
  }
}

async function editDepartment(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const department = await response.json();

    departmentIdInput.value = department._id;
    nameInput.value = department.name;
    descriptionInput.value = department.description || "";

    isEditing = true;
    formTitle.textContent = "Edit Department";
    submitBtn.textContent = "Update Department";
    cancelBtn.classList.remove("hidden");

    nameInput.focus();
  } catch (error) {
    console.error("Error fetching department:", error);
  }
}

async function deleteDepartment(id) {
  if (!confirm("Are you sure you want to delete this department?")) {
    return;
  }

  try {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    fetchDepartments();
  } catch (error) {
    console.error("Error deleting department:", error);
  }
}

function resetForm() {
  form.reset();
  departmentIdInput.value = "";
  isEditing = false;
  formTitle.textContent = "Add New Department";
  submitBtn.textContent = "Add Department";
  cancelBtn.classList.add("hidden");
}
