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
  const rsvpForm = toEl("rsvpForm");
  const rsvpPlayer = toEl("rsvpPlayerSelect")
  const rsvpButton = toEl("rsvpSubmit");
  const savedPlayer = localStorage.getItem("rsvpPlayer")

  const guestForm = toEl("guestForm");
  const guestName = toEl("guestName");
  const whoInvitedGuest = toEl("whoInvited");
  const guestButton = toEl("guestSubmit");

  if (savedPlayer && rsvpPlayer) {
    rsvpPlayer.value = savedPlayer;
  }
  rsvpPlayer?.addEventListener("change", () => {
    localStorage.setItem("rsvpPlayer", rsvpPlayer.value);
  });

  rsvpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const baseUrl = window.location.origin;
    

    const player = toEl("rsvpPlayerSelect").value;
    const rsvp = toEl("rsvpResponseSelect").value;

    rsvpButton.disabled = true;
    rsvpButton.innerHTML = `<span class="spinner" style="border:3px solid rgba(255,255,255,0.3);border-top:3px solid white;border-radius:50%;width:16px;height:16px;display:inline-block;animation:spin 1s linear infinite;margin-right:8px"></span> RSVPing...`;

    const gameRes = await fetch("/pickup/current-game")
    const gameData = await gameRes.json();
    const gameId = gameData.id;

    const playerRes = await postJSON("/pickup/get-player-id", { "email": player });
    const playerData = await playerRes.json();
    const playerId = playerData.id;

    try {
      const respRes = await fetch(`${baseUrl}/pickup/respond?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(playerId)}&status=${rsvp}`)
    }
    catch (err) {
    } finally {
      rsvpButton.disabled = false;
      rsvpButton.innerHTML = "Submit RSVP";
      window.location.reload();
    }
  });

  guestForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    guestButton.disabled = true;
    guestButton.innerHTML = `<span class="spinner" style="border:3px solid rgba(255,255,255,0.3);border-top:3px solid white;border-radius:50%;width:16px;height:16px;display:inline-block;animation:spin 1s linear infinite;margin-right:8px"></span> Adding...`;

    const name = guestName.value.trim();
    const status = toEl("guestResponseSelect").value;
    const whoInvited = whoInvitedGuest.value.trim();
    const guestMsg = document.getElementById("guestStatus");

    if (!name) {
      guestMsg.innerHTML = "Guest name is required.";
      guestButton.disabled = false;
      guestButton.innerHTML = "Submit Guest RSVP";
      return;
    }

    // Get current game ID
    const gameRes = await fetch("/pickup/current-game");
    const gameData = await gameRes.json();
    const gameId = gameData.id;

    try {
      await postJSON("/pickup/add-guest", {
        name,
        status,
        gameId,
        whoInvited
      });
      guestName.value = "";
      whoInvitedGuest.value = "";
    } catch (err) {
      console.error(err);
    } finally {
      guestButton.disabled = false;
      guestButton.innerHTML = "Submit Guest RSVP";
      window.location.reload();
    }
  });
});
