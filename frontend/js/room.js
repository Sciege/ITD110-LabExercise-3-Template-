const API_URL = "http://localhost:5001/api/rooms";

const form = document.getElementById("room-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const roomIdInput = document.getElementById("room-id");
const nameInput = document.getElementById("name");
const typeInput = document.getElementById("type");
const capacityInput = document.getElementById("capacity");
const tbody = document.getElementById("room-tbody");
const noRoomsMsg = document.getElementById("no-rooms");

let isEditing = false;

document.addEventListener("DOMContentLoaded", fetchRooms);

form.addEventListener("submit", handleSubmit);
cancelBtn.addEventListener("click", resetForm);

async function fetchRooms() {
  try {
    const response = await fetch(API_URL);
    const rooms = await response.json();
    renderRooms(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
  }
}

function renderRooms(rooms) {
  tbody.innerHTML = "";

  if (rooms.length === 0) {
    noRoomsMsg.classList.remove("hidden");
    return;
  }

  noRoomsMsg.classList.add("hidden");

  rooms.forEach((room) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${escapeHtml(room.name)}</td>
            <td>${escapeHtml(room.type)}</td>
            <td>${room.availableCapacity} / ${room.capacity}</td>
            <td>
                <button class="btn-edit" onclick="editRoom('${room._id}')">Edit</button>
                <button class="btn-delete" onclick="deleteRoom('${room._id}')">Delete</button>
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

  const roomData = {
    name: nameInput.value.trim(),
    type: typeInput.value,
    capacity: capacityInput.value ? Number(capacityInput.value) : null,
  };

  try {
    if (isEditing) {
      await fetch(`${API_URL}/${roomIdInput.value}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomData),
      });
    } else {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomData),
      });
    }

    resetForm();
    fetchRooms();
  } catch (error) {
    console.error("Error saving room:", error);
  }
}

async function editRoom(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const room = await response.json();

    roomIdInput.value = room._id;
    nameInput.value = room.name;
    typeInput.value = room.type;
    capacityInput.value = room.capacity || "";

    isEditing = true;
    formTitle.textContent = "Edit Room";
    submitBtn.textContent = "Update Room";
    cancelBtn.classList.remove("hidden");

    nameInput.focus();
  } catch (error) {
    console.error("Error fetching room:", error);
  }
}

async function deleteRoom(id) {
  if (!confirm("Are you sure you want to delete this room?")) {
    return;
  }

  try {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    fetchRooms();
  } catch (error) {
    console.error("Error deleting room:", error);
  }
}

function resetForm() {
  form.reset();
  roomIdInput.value = "";
  isEditing = false;
  formTitle.textContent = "Add New Room";
  submitBtn.textContent = "Add Room";
  cancelBtn.classList.add("hidden");
}
