// Handles add/remove players, create game, resend, inline messages, spinner, and disabling until response.
// All requests use /pickup/* endpoints.

function toEl(id) { return document.getElementById(id); }

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `Request failed: ${res.status}`);
  }

  // If body exists and looks like JSON, parse it
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {}; // Return empty object for non-JSON responses
  }
}

function parseServerDate(str) {
  let formattedDate = new Date(str.replace(" ", "T") + "Z");
  return formattedDate.toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short"
  });
}

async function loadLogs() {
  const logs = await fetch("/pickup/logs").then(r => r.json());
  const div = document.getElementById("logContainer");
  div.innerHTML = logs.map(l => `
    <div style="padding:4px;border-bottom:1px solid #ddd">
      <b>${l.playerName}</b> → <u>${l.newResponse}</u>
      ${l.priorResponse ? `(was ${l.priorResponse})` : ""}
      <br/><small>${parseServerDate(l.timestamp)} | ${l.ip}</small>
    </div>
  `).join("");
}
loadLogs();

document.addEventListener("DOMContentLoaded", () => {
  // Wednesday warning element
  const dateInput = toEl("gameDate");

  let wedWarning = document.createElement("div");
  wedWarning.id = "wednesdayWarning";
  wedWarning.style.marginTop = "6px";
  wedWarning.style.fontWeight = "bold";
  dateInput.insertAdjacentElement("afterend", wedWarning);

  // Utility: next Wednesday (future only)
  function getNextWednesday(from = new Date()) {
    const date = new Date(from);
    const day = date.getDay();
    const diff = (3 - day + 7) % 7 || 7;  // Always next week if today is Wed
    date.setDate(date.getDate() + diff);
    return date;
  }

  const nextWed = getNextWednesday();

  flatpickr("#gameDate", {
    dateFormat: "Y-m-d",
    defaultDate: nextWed,

    onDayCreate: function(_, __, ___, dayElem) {
      const d = dayElem.dateObj;
      const today = new Date();
      today.setHours(0,0,0,0);

      // Skip past days completely
      if (d < today) return;

      // Future Wednesdays → light green
      if (d.getDay() === 3) {
        dayElem.style.background = "#d4f7d4";
        dayElem.style.borderRadius = "6px";
        dayElem.style.fontWeight = "bold";
      }

      // Next Wednesday → darker green
      if (
        d.getFullYear() === nextWed.getFullYear() &&
        d.getMonth() === nextWed.getMonth() &&
        d.getDate() === nextWed.getDate()
      ) {
        dayElem.style.background = "#8be78b"; // darker shade
        dayElem.style.borderRadius = "6px";
        dayElem.style.fontWeight = "bold";
      }
    },

    onChange: function(selectedDates) {
      if (!selectedDates.length) return;

      const d = selectedDates[0];
      if (d.getDay() !== 3) {
        wedWarning.textContent = "⚠️ This date is NOT a Wednesday. Are you sure?";
        wedWarning.style.color = "#dc2626";
      } else {
        wedWarning.textContent = "";
      }
    }
  });

  // Create Game
  const createForm = toEl("createGameForm");
  const createButton = toEl("createGameButton");
  const createMsg = toEl("createGameMessage");

  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    createMsg.textContent = ""; createMsg.className = "response-message";

    const date = toEl("gameDate").value;
    const time = toEl("gameTime").value;
    const location = toEl("gameLocation").value.trim();
    if (!date || !time || !location) { createMsg.textContent = "All fields required"; createMsg.classList.add("error"); return; }

    // Disable button until response
    createButton.disabled = true;
    createButton.innerHTML = `<span class="spinner" style="border:3px solid rgba(255,255,255,0.3);border-top:3px solid white;border-radius:50%;width:16px;height:16px;display:inline-block;animation:spin 1s linear infinite;margin-right:8px"></span> Creating...`;

    try {
      const json = await postJSON("/pickup/create-game", { date, time, location });
      createMsg.textContent = `✅ Game created: ${json.date} at ${json.location}`;
      createMsg.classList.add("success");
    } catch (err) {
      createMsg.textContent = `❌ ${err.message || "Network error"}`;
      createMsg.classList.add("error");
    }finally {
      createButton.disabled = false;
      createButton.innerHTML = "Create Game";
    }
  });

  // Email broadcast
  const broadcastForm = document.getElementById("broadcastEmailForm");
  const broadcastBtn = document.getElementById("broadcastSendBtn");
  const broadcastMsg = document.getElementById("broadcastStatus");

  broadcastForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    broadcastBtn.disabled = true;
    broadcastMsg.innerHTML = "Sending...";

    const subject = document.getElementById("broadcastSubject").value;
    const body = document.getElementById("broadcastBody").value;

    try {
      const result = (await postJSON("/pickup/broadcast-email", { subject, body }));
      console.log("Broadcast response:", result);
      broadcastMsg.innerHTML = `✔ Sent ${result.sent} emails!`;
    } catch (err) {
      broadcastMsg.innerHTML = "❌ Error sending emails.";
      console.error(err);
    }

    broadcastBtn.disabled = false;
  });
  
  // Add Player
  const addForm = toEl("addPlayerForm");
  const addStatus = toEl("addStatus");
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    addStatus.textContent = "";
    addStatus.className = "response-message";

    const name = toEl("playerName").value.trim();
    const email = toEl("playerEmail").value.trim();
    if (!name || !email) {
      addStatus.textContent = "Name and email required";
      addStatus.classList.add("error");
      return;
    }

    try {
      await postJSON("/pickup/add-player", { name, email });
      addStatus.textContent = "✅ Player added";
      addStatus.classList.add("success");
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      addStatus.textContent = `❌ ${err.message}`;
      addStatus.classList.add("error");
    }
  });

  // Remove Player
  const removeForm = toEl("removePlayerForm");
  const removeStatus = toEl("removeStatus");
  removeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    removeStatus.textContent = "";
    removeStatus.className = "response-message";
    const email = toEl("removePlayerSelect").value;
    if (!email) { removeStatus.textContent = "No player selected"; removeStatus.classList.add("error"); return; }

    try {
      await postJSON("/pickup/remove-player", { email });
      removeStatus.textContent = "✅ Player removed";
      removeStatus.classList.add("success");
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      removeStatus.textContent = `❌ ${err.message}`;
      removeStatus.classList.add("error");
    }
  });
});
