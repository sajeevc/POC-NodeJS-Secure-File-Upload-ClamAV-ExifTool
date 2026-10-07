const form = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const chosenName = document.getElementById("chosen-name");
const submitBtn = document.getElementById("submit-btn");
const eicarBtn = document.getElementById("eicar-btn");
const banner = document.getElementById("banner");
const clamPill = document.getElementById("clam-pill");
const limitPill = document.getElementById("limit-pill");
const lastResult = document.getElementById("last-result");
const resultMeta = document.getElementById("result-meta");
const removedMeta = document.getElementById("removed-meta");
const remainingMeta = document.getElementById("remaining-meta");
const filesTable = document.getElementById("files-table");
const emptyState = document.getElementById("empty-state");
const refreshBtn = document.getElementById("refresh-btn");

function showBanner(kind, text) {
  banner.className = `banner ${kind}`;
  banner.textContent = text;
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

async function loadHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    const ready = data.clamav?.ready;
    clamPill.textContent = ready
      ? `ClamAV ready (${data.clamav.engine})`
      : "ClamAV unavailable";
    clamPill.className = `pill ${ready ? "ok" : "bad"}`;
    const mb = Math.round((data.limits?.maxFileSizeBytes || 0) / (1024 * 1024));
    limitPill.textContent = `Size limit ${mb} MB`;
  } catch {
    clamPill.textContent = "Cannot reach API";
    clamPill.className = "pill bad";
  }
}

function renderLast(file) {
  lastResult.classList.remove("hidden");
  resultMeta.innerHTML = `
    <dt>Name</dt><dd>${file.originalName}</dd>
    <dt>Scanner</dt><dd>${file.scan.message} · ${file.scan.engine}</dd>
    <dt>Removed tags</dt><dd>${file.metadata.removedKeys.length}</dd>
  `;
  const removed = {};
  for (const key of file.metadata.removedKeys) {
    removed[key] = file.metadata.before[key];
  }
  removedMeta.textContent = file.metadata.removedKeys.length ? pretty(removed) : "No removable metadata found.";
  remainingMeta.textContent =
    Object.keys(file.metadata.after).length ? pretty(file.metadata.after) : "No remaining descriptive tags.";
}

function renderFiles(files) {
  const tbody = filesTable.querySelector("tbody");
  tbody.innerHTML = "";
  if (!files.length) {
    filesTable.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");
  filesTable.classList.remove("hidden");
  for (const file of files) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div>${file.originalName}</div>
        <div class="muted">${new Date(file.createdAt).toLocaleString()} · ${(file.size / 1024).toFixed(1)} KB</div>
      </td>
      <td><span class="tag">${file.scan.engine}: clean</span></td>
      <td>${file.metadata.removedKeys.length} tags stripped</td>
      <td><a href="/api/uploads/${file.id}/download">Download</a></td>
    `;
    tbody.appendChild(tr);
  }
}

async function loadFiles() {
  const res = await fetch("/api/uploads");
  const data = await res.json();
  renderFiles(data.files || []);
}

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("drag");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("drag");
  });
});
dropzone.addEventListener("drop", (event) => {
  const files = event.dataTransfer?.files;
  if (files?.length) {
    fileInput.files = files;
    chosenName.textContent = files[0].name;
  }
});
fileInput.addEventListener("change", () => {
  chosenName.textContent = fileInput.files[0]?.name || "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!fileInput.files[0]) {
    showBanner("bad", "Choose a file first.");
    return;
  }
  submitBtn.disabled = true;
  showBanner("ok", "Scanning and stripping metadata…");
  const body = new FormData();
  body.append("file", fileInput.files[0]);
  try {
    const res = await fetch("/api/uploads", { method: "POST", body });
    const data = await res.json();
    if (!res.ok) {
      const viruses = data.viruses?.length ? ` (${data.viruses.join(", ")})` : "";
      showBanner("bad", (data.error || "Upload rejected") + viruses);
      lastResult.classList.add("hidden");
      return;
    }
    showBanner("ok", data.message);
    renderLast(data.file);
    await loadFiles();
    form.reset();
    chosenName.textContent = "";
  } catch (error) {
    showBanner("bad", error instanceof Error ? error.message : "Upload failed");
  } finally {
    submitBtn.disabled = false;
  }
});

eicarBtn.addEventListener("click", async () => {
  const eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
  const file = new File([eicar], "eicar.com", { type: "application/octet-stream" });
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  chosenName.textContent = file.name;
  form.requestSubmit();
});

refreshBtn.addEventListener("click", () => loadFiles());

loadHealth();
loadFiles();
