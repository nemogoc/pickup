// Handles add/remove players, create game, resend, inline messages, spinner, and disabling until response.
// All requests use /pickup/* endpoints.

function toEl(id) { return document.getElementById(id); }

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res;
}

document.addEventListener("DOMContentLoaded", () => {
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
      const res = await postJSON("/pickup/create-game", { date, time, location });
      if (res.ok) {
        const json = await res.json();
        createMsg.textContent = `✅ Game created: ${json.date} at ${json.location}`;
        createMsg.classList.add("success");
      } else {
        const txt = await res.text();
        createMsg.textContent = `❌ ${txt || res.statusText}`;
        createMsg.classList.add("error");
      }
    } catch (err) {
      createMsg.textContent = "⚠️ Network error";
      createMsg.classList.add("error");
    } finally {
      createButton.disabled = false;
      createButton.innerHTML = "Create Game";
    }
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

    const res = await postJSON("/pickup/add-player", { name, email });
    if (res.ok) {
      addStatus.textContent = "✅ Player added";
      addStatus.classList.add("success");
      // Optionally refresh the page to update dropdown
      setTimeout(() => location.reload(), 700);
    } else {
      const txt = await res.text();
      addStatus.textContent = `❌ ${txt || res.statusText}`;
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

    const res = await postJSON("/pickup/remove-player", { email });
    if (res.ok) {
      removeStatus.textContent = "✅ Player removed";
      removeStatus.classList.add("success");
      setTimeout(() => location.reload(), 700);
    } else {
      const txt = await res.text();
      removeStatus.textContent = `❌ ${txt || res.statusText}`;
      removeStatus.classList.add("error");
    }
  });
});
