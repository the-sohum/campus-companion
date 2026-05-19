/* ═══════════════════════════════════════════════════════════════════
   CAMPUS COMPANION — script.js
   Author : Sohum Sardana
   Purpose: All interactivity for the Campus Companion web app.

   HOW THIS FILE IS ORGANISED
   ──────────────────────────
   1.  Constants & localStorage helpers
   2.  App initialisation  (runs on DOMContentLoaded)
   3.  Navigation / sidebar
   4.  Theme toggle  (dark ↔ light)
   5.  Clock & greeting
   6.  Dashboard stats
   7.  Timetable module
   8.  Attendance module
   9.  Mess menu module
   10. SGPA / CGPA calculator
   11. Tasks module
   12. Modal helpers
   13. Utility functions
═══════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════
   1.  CONSTANTS & LOCAL-STORAGE HELPERS
   ─────────────────────────────────────
   We keep all localStorage keys in one place so we never mistype them.
   The get/set/remove helpers handle JSON parsing automatically.
═══════════════════════════════════════════════════════════════════ */

const KEYS = {
  theme:      "cc_theme",        // "dark" | "light"
  timetable:  "cc_timetable",    // array of class objects
  attendance: "cc_attendance",   // array of subject objects
  mess:       "cc_mess",         // object  { Monday:{breakfast,lunch,…}, … }
  tasks:      "cc_tasks",        // array of task objects
  cgpa:       "cc_cgpa",         // array of past SGPA values
};

/**
 * lsGet – Read a value from localStorage and parse it as JSON.
 * Returns `defaultVal` if the key doesn't exist yet.
 */
function lsGet(key, defaultVal = null) {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultVal;
  try { return JSON.parse(raw); } catch { return defaultVal; }
}

/**
 * lsSet – Stringify a value and save it to localStorage.
 */
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


/* ═══════════════════════════════════════════════════════════════════
   2.  APP INITIALISATION
   ──────────────────────
   Everything kicks off here once the HTML is fully loaded.
═══════════════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  // Apply saved theme before anything renders (prevents flash)
  applyTheme(lsGet(KEYS.theme, "dark"));

  // Start the live clock
  startClock();

  // Wire up navigation
  initNavigation();

  // Wire up mobile sidebar hamburger
  initMobileSidebar();

  // Wire up theme toggle buttons
  initThemeToggle();

  // Load all modules
  renderDashboard();
  initTimetable();
  initAttendance();
  initMess();
  initCGPA();
  initTasks();

  // Wire up all modal close buttons
  initModals();
});


/* ═══════════════════════════════════════════════════════════════════
   3.  NAVIGATION / SIDEBAR
   ────────────────────────
   Clicking a nav item hides all sections and shows the target one.
═══════════════════════════════════════════════════════════════════ */

function initNavigation() {
  // Get every nav link in the sidebar
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();

      // Which section should we show?
      const targetSection = item.dataset.section;

      // Remove "active" from all nav items, add to clicked one
      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");

      // Hide all sections, show target
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      document.getElementById("section-" + targetSection).classList.add("active");

      // Refresh dashboard stats every time we return to dashboard
      if (targetSection === "dashboard") renderDashboard();

      // Close mobile sidebar after navigation
      closeMobileSidebar();
    });
  });
}


/* ═══════════════════════════════════════════════════════════════════
   4.  MOBILE SIDEBAR
   ──────────────────
   On small screens the sidebar is hidden and toggled by hamburger.
═══════════════════════════════════════════════════════════════════ */

function initMobileSidebar() {
  const hamburger = document.getElementById("hamburger");
  const sidebar   = document.getElementById("sidebar");
  const overlay   = document.getElementById("sidebarOverlay");

  // Open sidebar
  hamburger.addEventListener("click", () => {
    sidebar.classList.add("open");
    overlay.classList.add("active");
  });

  // Close sidebar when overlay is tapped
  overlay.addEventListener("click", closeMobileSidebar);
}

function closeMobileSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("active");
}


/* ═══════════════════════════════════════════════════════════════════
   5.  THEME TOGGLE
   ─────────────────
   Toggles between "dark" and "light" on the <html> element.
═══════════════════════════════════════════════════════════════════ */

function initThemeToggle() {
  // Desktop button (inside sidebar)
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  // Mobile button (in topbar)
  document.getElementById("themeToggleMobile").addEventListener("click", toggleTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next    = current === "dark" ? "light" : "dark";
  applyTheme(next);
  lsSet(KEYS.theme, next);
}

/**
 * applyTheme – Sets data-theme attribute and updates icon/label.
 */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);

  // Update desktop sidebar icon + label
  const icon  = document.getElementById("themeIcon");
  const label = document.getElementById("themeLabel");
  const iconM = document.getElementById("themeIconMobile");

  if (theme === "dark") {
    icon.className  = "ph ph-moon";
    iconM.className = "ph ph-moon";
    label.textContent = "Dark Mode";
  } else {
    icon.className  = "ph ph-sun";
    iconM.className = "ph ph-sun";
    label.textContent = "Light Mode";
  }
}


/* ═══════════════════════════════════════════════════════════════════
   6.  CLOCK & GREETING
   ─────────────────────
   Updates the live clock every second and sets the greeting text.
═══════════════════════════════════════════════════════════════════ */

function startClock() {
  // Run immediately, then repeat every 1000ms
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();

  /* ── Live clock ── */
  document.getElementById("liveClock").textContent = now.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });

  /* ── Date string ── */
  document.getElementById("liveDate").textContent = now.toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  /* ── Greeting based on hour ── */
  const hour = now.getHours();
  const greetEl = document.querySelector(".greeting-sub");
  if (greetEl) {
    if (hour < 12)       greetEl.textContent = "Good morning,";
    else if (hour < 17)  greetEl.textContent = "Good afternoon,";
    else                 greetEl.textContent = "Good evening,";
  }

  /* ── Update countdown every second ── */
  updateNextClassCountdown();
}


/* ═══════════════════════════════════════════════════════════════════
   7A.  DASHBOARD — RENDER
   ────────────────────────
   Pulls data from all modules and populates the dashboard cards.
═══════════════════════════════════════════════════════════════════ */

function renderDashboard() {
  const attendance = lsGet(KEYS.attendance, []);
  const tasks      = lsGet(KEYS.tasks, []);
  const timetable  = lsGet(KEYS.timetable, []);

  /* ── Stat: Subject count ── */
  document.getElementById("statSubjects").textContent = attendance.length;

  /* ── Stat: Average attendance ── */
  if (attendance.length > 0) {
    const avg = attendance.reduce((sum, s) => {
      return sum + (s.total > 0 ? (s.present / s.total) * 100 : 0);
    }, 0) / attendance.length;
    document.getElementById("statAttendance").textContent = avg.toFixed(1) + "%";
  } else {
    document.getElementById("statAttendance").textContent = "–";
  }

  /* ── Stat: Tasks done / total ── */
  const done  = tasks.filter(t => t.done).length;
  document.getElementById("statTasks").textContent = `${done}/${tasks.length}`;

  /* ── Stat: SGPA (from CGPA section) ── */
  const cgpaSubs = lsGet(KEYS.cgpa + "_subs", []);
  const sgpaVal  = calculateSGPAValue(cgpaSubs);
  document.getElementById("statSGPA").textContent = sgpaVal > 0 ? sgpaVal.toFixed(2) : "–";

  /* ── Attendance overview ── */
  renderDashboardAttendance(attendance);

  /* ── Mess preview ── */
  renderMessPreview();
}

/**
 * Renders compact attendance bars on the dashboard.
 */
function renderDashboardAttendance(attendance) {
  const container = document.getElementById("dashboardAttendance");
  if (attendance.length === 0) {
    container.innerHTML = `<p class="empty-state">No subjects added. Go to Attendance to add subjects.</p>`;
    return;
  }

  container.innerHTML = attendance.map(sub => {
    const pct   = sub.total > 0 ? Math.min(100, (sub.present / sub.total) * 100) : 0;
    const color = pct >= 75 ? "var(--green)" : pct >= 60 ? "var(--amber)" : "var(--red)";
    return `
      <div class="dash-att-row">
        <span class="dash-att-name">${escapeHtml(sub.name)}</span>
        <div class="dash-att-bar-wrap">
          <div class="dash-att-bar" style="width:${pct}%; background:${color};"></div>
        </div>
        <span class="dash-att-pct">${pct.toFixed(0)}%</span>
      </div>
    `;
  }).join("");
}

/**
 * Shows today's mess preview on the dashboard.
 */
function renderMessPreview() {
  const dayName = getDayName();            // e.g. "Monday"
  const messData = lsGet(KEYS.mess, {});
  const today    = messData[dayName] || {};

  document.getElementById("prevBreakfast").textContent = today.breakfast || "Not set";
  document.getElementById("prevLunch").textContent     = today.lunch     || "Not set";
  document.getElementById("prevSnacks").textContent    = today.snacks    || "Not set";
  document.getElementById("prevDinner").textContent    = today.dinner    || "Not set";
}


/* ═══════════════════════════════════════════════════════════════════
   7B.  NEXT CLASS COUNTDOWN
   ──────────────────────────
   Scans today's timetable and finds the nearest upcoming class.
═══════════════════════════════════════════════════════════════════ */

function updateNextClassCountdown() {
  const timetable = lsGet(KEYS.timetable, []);
  const now       = new Date();
  const dayName   = getDayName();

  // Filter classes for today and that haven't ended yet
  const todayClasses = timetable
    .filter(c => c.day === dayName)
    .map(c => ({ ...c, startMs: timeToMs(c.start), endMs: timeToMs(c.end) }))
    .sort((a, b) => a.startMs - b.startMs);

  const nowMs = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000;

  // Find the next class that hasn't started yet
  const next = todayClasses.find(c => c.startMs > nowMs);
  // Or the currently ongoing class
  const ongoing = todayClasses.find(c => c.startMs <= nowMs && c.endMs > nowMs);

  const nameEl      = document.getElementById("nextClassName");
  const timeEl      = document.getElementById("nextClassTime");
  const countdownEl = document.getElementById("countdownTimer");

  if (!nameEl) return; // Dashboard not mounted

  if (ongoing) {
    nameEl.textContent      = "🟢 " + ongoing.subject + " (ongoing)";
    timeEl.textContent      = `${ongoing.start} – ${ongoing.end}  ${ongoing.room ? "| " + ongoing.room : ""}`;
    const remaining         = ongoing.endMs - nowMs;
    countdownEl.textContent = "Ends in " + formatCountdown(remaining);
  } else if (next) {
    nameEl.textContent      = next.subject;
    timeEl.textContent      = `${next.start} – ${next.end}  ${next.room ? "| " + next.room : ""}`;
    const diff              = next.startMs - nowMs;
    countdownEl.textContent = formatCountdown(diff);
  } else {
    nameEl.textContent      = "No more classes today 🎉";
    timeEl.textContent      = "";
    countdownEl.textContent = "–";
  }
}

/**
 * formatCountdown – Converts milliseconds into "HH:MM:SS" string.
 */
function formatCountdown(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

/**
 * timeToMs – Converts "HH:MM" string to milliseconds since midnight.
 */
function timeToMs(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 3600000 + m * 60000;
}


/* ═══════════════════════════════════════════════════════════════════
   8.  TIMETABLE MODULE
   ─────────────────────
   Allows adding/editing/deleting classes per day.
   Data shape: array of { id, day, subject, start, end, room, faculty }
═══════════════════════════════════════════════════════════════════ */

/** Currently selected day in the timetable tab view. */
let currentTTDay = "Monday";

function initTimetable() {
  // Day tab clicks
  document.querySelectorAll(".day-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".day-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentTTDay = tab.dataset.day;
      renderTimetable();
    });
  });

  // "Add Class" button opens modal
  document.getElementById("ttAddBtn").addEventListener("click", () => {
    openTTModal();  // fresh modal with no pre-filled values
  });

  // Save button inside modal
  document.getElementById("ttSaveBtn").addEventListener("click", saveTTEntry);

  // Search box filters displayed subjects
  document.getElementById("ttSearch").addEventListener("input", renderTimetable);

  // Initial render for Monday
  renderTimetable();
}

/**
 * renderTimetable – Draws cards for the currently selected day.
 * Highlights the ongoing class if any.
 */
function renderTimetable() {
  const grid        = document.getElementById("timetableGrid");
  const searchQuery = document.getElementById("ttSearch").value.toLowerCase().trim();
  const timetable   = lsGet(KEYS.timetable, []);

  // Filter: correct day + optional search query
  let filtered = timetable.filter(c => c.day === currentTTDay);
  if (searchQuery) {
    filtered = filtered.filter(c =>
      c.subject.toLowerCase().includes(searchQuery) ||
      (c.faculty && c.faculty.toLowerCase().includes(searchQuery)) ||
      (c.room && c.room.toLowerCase().includes(searchQuery))
    );
  }

  // Sort by start time
  filtered.sort((a, b) => timeToMs(a.start) - timeToMs(b.start));

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-state">No classes found. Try a different day or search term.</p>`;
    return;
  }

  // Check if any class is currently ongoing (for today only)
  const nowMs   = getNowMs();
  const today   = getDayName();

  grid.innerHTML = filtered.map((c, idx) => {
    const isOngoing = (c.day === today) && (timeToMs(c.start) <= nowMs) && (timeToMs(c.end) > nowMs);
    const durationMin = Math.round((timeToMs(c.end) - timeToMs(c.start)) / 60000);

    return `
      <div class="tt-card ${isOngoing ? "ongoing" : ""}">
        <div class="tt-time-block">
          <div class="tt-time">${c.start}</div>
          <div class="tt-duration">${durationMin}min</div>
          <div class="tt-time">${c.end}</div>
        </div>
        <div class="tt-divider"></div>
        <div class="tt-info">
          <div class="tt-subject">${escapeHtml(c.subject)}</div>
          <div class="tt-meta">
            ${c.room    ? `<span><i class="ph ph-map-pin"></i> ${escapeHtml(c.room)}</span>` : ""}
            ${c.faculty ? `<span><i class="ph ph-user"></i> ${escapeHtml(c.faculty)}</span>` : ""}
          </div>
        </div>
        ${isOngoing ? `<span class="tt-badge-ongoing">Live</span>` : ""}
        <div class="tt-actions">
          <button class="btn-icon" title="Edit" onclick="openTTModal(${c.id})">
            <i class="ph ph-pencil"></i>
          </button>
          <button class="btn-icon" title="Delete" onclick="deleteTTEntry(${c.id})">
            <i class="ph ph-trash" style="color:var(--red)"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * openTTModal – Opens the add/edit modal.
 * If `id` is provided, pre-fills with existing data (edit mode).
 */
function openTTModal(id = null) {
  const timetable = lsGet(KEYS.timetable, []);
  const modal     = document.getElementById("ttModal");

  // Reset all fields first
  document.getElementById("ttEditIndex").value = id !== null ? id : -1;
  document.getElementById("ttSubject").value   = "";
  document.getElementById("ttStart").value     = "";
  document.getElementById("ttEnd").value       = "";
  document.getElementById("ttRoom").value      = "";
  document.getElementById("ttFaculty").value   = "";
  document.getElementById("ttDay").value       = currentTTDay;
  document.getElementById("ttModalTitle").textContent = id !== null ? "Edit Class" : "Add Class";

  // If editing, fill in existing values
  if (id !== null) {
    const entry = timetable.find(c => c.id === id);
    if (entry) {
      document.getElementById("ttDay").value     = entry.day;
      document.getElementById("ttSubject").value = entry.subject;
      document.getElementById("ttStart").value   = entry.start;
      document.getElementById("ttEnd").value     = entry.end;
      document.getElementById("ttRoom").value    = entry.room || "";
      document.getElementById("ttFaculty").value = entry.faculty || "";
    }
  }

  openModal("ttModal");
}

/**
 * saveTTEntry – Reads form values and saves (add or update) to localStorage.
 */
function saveTTEntry() {
  const subject = document.getElementById("ttSubject").value.trim();
  const start   = document.getElementById("ttStart").value;
  const end     = document.getElementById("ttEnd").value;

  // Simple validation
  if (!subject) return showToast("Please enter a subject name.", "warn");
  if (!start || !end) return showToast("Please set start and end times.", "warn");
  if (start >= end)   return showToast("End time must be after start time.", "warn");

  const timetable = lsGet(KEYS.timetable, []);
  const editId    = parseInt(document.getElementById("ttEditIndex").value);

  const entry = {
    id:      editId !== -1 ? editId : Date.now(),   // use timestamp as unique id
    day:     document.getElementById("ttDay").value,
    subject,
    start,
    end,
    room:    document.getElementById("ttRoom").value.trim(),
    faculty: document.getElementById("ttFaculty").value.trim(),
  };

  if (editId !== -1) {
    // Replace existing entry
    const idx = timetable.findIndex(c => c.id === editId);
    if (idx !== -1) timetable[idx] = entry;
  } else {
    timetable.push(entry);
  }

  lsSet(KEYS.timetable, timetable);
  closeModal("ttModal");
  renderTimetable();
  renderDashboard();
  showToast("Class saved!", "success");
}

/**
 * deleteTTEntry – Removes a class by its id after confirmation.
 */
function deleteTTEntry(id) {
  if (!confirm("Delete this class?")) return;
  const timetable = lsGet(KEYS.timetable, []).filter(c => c.id !== id);
  lsSet(KEYS.timetable, timetable);
  renderTimetable();
  renderDashboard();
  showToast("Class removed.", "info");
}


/* ═══════════════════════════════════════════════════════════════════
   9.  ATTENDANCE MODULE
   ──────────────────────
   Data shape: array of { id, name, present, total }
   Attendance % = (present / total) * 100
═══════════════════════════════════════════════════════════════════ */

function initAttendance() {
  document.getElementById("attAddBtn").addEventListener("click", () => openModal("attModal"));
  document.getElementById("attSaveBtn").addEventListener("click", saveAttSubject);
  renderAttendance();
}

/**
 * renderAttendance – Draws one card per subject with a progress bar.
 */
function renderAttendance() {
  const list       = document.getElementById("attendanceList");
  const warning    = document.getElementById("attendanceWarning");
  const attendance = lsGet(KEYS.attendance, []);

  if (attendance.length === 0) {
    list.innerHTML = `<p class="empty-state">No subjects yet. Click "Add Subject" to start tracking.</p>`;
    warning.style.display = "none";
    return;
  }

  // Calculate average for warning banner
  const avg = attendance.reduce((sum, s) => {
    return sum + (s.total > 0 ? (s.present / s.total) * 100 : 0);
  }, 0) / attendance.length;

  warning.style.display = avg < 75 ? "flex" : "none";

  list.innerHTML = attendance.map(sub => {
    const pct     = sub.total > 0 ? Math.min(100, (sub.present / sub.total) * 100) : 0;
    const cls     = pct >= 75 ? "good" : pct >= 60 ? "warn" : "bad";
    const isLow   = pct < 75;

    // How many more classes needed to reach 75%?
    const needed  = calcClassesNeeded(sub.present, sub.total);

    return `
      <div class="att-card ${isLow ? "low-attendance" : ""}">
        <div class="att-header">
          <span class="att-subject">${escapeHtml(sub.name)}</span>
          <span class="att-percent ${cls}">${pct.toFixed(1)}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill ${cls}" style="width:${pct}%"></div>
        </div>
        <div class="att-stats">
          ${sub.present} present / ${sub.total} total
          ${isLow && needed > 0 ? `&nbsp;·&nbsp; Attend <strong>${needed}</strong> more classes to reach 75%` : ""}
          ${pct >= 75 ? `&nbsp;·&nbsp; ✅ Safe to skip <strong>${calcCanSkip(sub.present, sub.total)}</strong> classes` : ""}
        </div>
        <div class="att-actions">
          <button class="btn btn-success" onclick="markAttendance(${sub.id}, 'present')">
            <i class="ph ph-check"></i> Present
          </button>
          <button class="btn btn-danger" onclick="markAttendance(${sub.id}, 'absent')">
            <i class="ph ph-x"></i> Absent
          </button>
          <span class="att-count-badge">${sub.present}P / ${sub.total - sub.present}A</span>
          <button class="btn-icon" style="margin-left:auto" title="Delete subject" onclick="deleteAttSubject(${sub.id})">
            <i class="ph ph-trash" style="color:var(--red)"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * saveAttSubject – Reads the modal form and adds a new subject.
 */
function saveAttSubject() {
  const name    = document.getElementById("attSubject").value.trim();
  const present = parseInt(document.getElementById("attPresent").value) || 0;
  const total   = parseInt(document.getElementById("attTotal").value)   || 0;

  if (!name)        return showToast("Please enter a subject name.", "warn");
  if (total < present) return showToast("Total classes can't be less than attended.", "warn");

  const attendance = lsGet(KEYS.attendance, []);
  attendance.push({ id: Date.now(), name, present, total });
  lsSet(KEYS.attendance, attendance);

  // Clear inputs for next time
  document.getElementById("attSubject").value = "";
  document.getElementById("attPresent").value = "0";
  document.getElementById("attTotal").value   = "0";

  closeModal("attModal");
  renderAttendance();
  renderDashboard();
  showToast("Subject added!", "success");
}

/**
 * markAttendance – Increments present count (and total) for a subject.
 */
function markAttendance(id, status) {
  const attendance = lsGet(KEYS.attendance, []);
  const idx        = attendance.findIndex(s => s.id === id);
  if (idx === -1) return;

  attendance[idx].total += 1;
  if (status === "present") attendance[idx].present += 1;

  lsSet(KEYS.attendance, attendance);
  renderAttendance();
  renderDashboard();
  showToast(status === "present" ? "Marked Present ✅" : "Marked Absent ❌", status === "present" ? "success" : "warn");
}

/**
 * deleteAttSubject – Removes a subject from attendance tracking.
 */
function deleteAttSubject(id) {
  if (!confirm("Remove this subject from attendance tracking?")) return;
  const updated = lsGet(KEYS.attendance, []).filter(s => s.id !== id);
  lsSet(KEYS.attendance, updated);
  renderAttendance();
  renderDashboard();
  showToast("Subject removed.", "info");
}

/**
 * calcClassesNeeded – How many consecutive classes to attend to hit 75%?
 * Formula: (present + x) / (total + x) >= 0.75  →  x = ceil((0.75*total - present) / 0.25)
 */
function calcClassesNeeded(present, total) {
  if (total === 0 || (present / total) >= 0.75) return 0;
  return Math.ceil((0.75 * total - present) / 0.25);
}

/**
 * calcCanSkip – How many classes can be skipped while staying >= 75%?
 * Formula: (present) / (total + x) >= 0.75  →  x = floor(present / 0.75 - total)
 */
function calcCanSkip(present, total) {
  return Math.max(0, Math.floor(present / 0.75 - total));
}


/* ═══════════════════════════════════════════════════════════════════
   10.  MESS MENU MODULE
   ──────────────────────
   Data shape: { Monday:{breakfast,lunch,snacks,dinner}, Tuesday:{…}, … }
═══════════════════════════════════════════════════════════════════ */

/** The currently displayed mess day. */
let currentMessDay = getDayName(); // default to today

function initMess() {
  const select = document.getElementById("messDay");

  // Set dropdown to today by default
  select.value = currentMessDay;

  // Listen for day change
  select.addEventListener("change", () => {
    currentMessDay = select.value;
    renderMess();
  });

  // "Edit Menu" button opens modal
  document.getElementById("messEditBtn").addEventListener("click", openMessModal);

  // Save inside modal
  document.getElementById("messSaveBtn").addEventListener("click", saveMessMenu);

  renderMess();
}

/**
 * renderMess – Shows 4 meal cards for the selected day.
 */
function renderMess() {
  const grid   = document.getElementById("messGrid");
  const data   = lsGet(KEYS.mess, {});
  const day    = data[currentMessDay] || {};

  const meals = [
    { key: "breakfast", emoji: "🍳", label: "Breakfast", placeholder: "Not set" },
    { key: "lunch",     emoji: "🍱", label: "Lunch",     placeholder: "Not set" },
    { key: "snacks",    emoji: "🫖", label: "Snacks",    placeholder: "Not set" },
    { key: "dinner",    emoji: "🌙", label: "Dinner",    placeholder: "Not set" },
  ];

  grid.innerHTML = meals.map(m => `
    <div class="mess-card">
      <div class="mess-meal-header">
        <span class="mess-meal-emoji">${m.emoji}</span>
        <span class="mess-meal-title">${m.label}</span>
      </div>
      <div class="mess-meal-content">
        ${escapeHtml(day[m.key] || m.placeholder)}
      </div>
    </div>
  `).join("");
}

/**
 * openMessModal – Pre-fills the modal with current day's menu.
 */
function openMessModal() {
  const data = lsGet(KEYS.mess, {});
  const day  = data[currentMessDay] || {};

  document.getElementById("messModalTitle").textContent = `Edit Menu — ${currentMessDay}`;
  document.getElementById("messBreakfast").value = day.breakfast || "";
  document.getElementById("messLunch").value     = day.lunch     || "";
  document.getElementById("messSnacks").value    = day.snacks    || "";
  document.getElementById("messDinner").value    = day.dinner    || "";

  openModal("messModal");
}

/**
 * saveMessMenu – Saves the edited menu for the current day.
 */
function saveMessMenu() {
  const data = lsGet(KEYS.mess, {});

  // Save or update this day's menu
  data[currentMessDay] = {
    breakfast: document.getElementById("messBreakfast").value.trim(),
    lunch:     document.getElementById("messLunch").value.trim(),
    snacks:    document.getElementById("messSnacks").value.trim(),
    dinner:    document.getElementById("messDinner").value.trim(),
  };

  lsSet(KEYS.mess, data);
  closeModal("messModal");
  renderMess();
  renderMessPreview();   // also update dashboard
  showToast("Menu saved!", "success");
}


/* ═══════════════════════════════════════════════════════════════════
   11.  SGPA / CGPA CALCULATOR
   ────────────────────────────
   SGPA = Σ(credits × grade) / Σ(credits)
   CGPA = average of all semester SGPAs
═══════════════════════════════════════════════════════════════════ */

/** The list of subjects for the current semester SGPA calculation. */
let cgpaSubjects = lsGet(KEYS.cgpa + "_subs", []);
/** The list of past semester SGPAs for CGPA estimation. */
let pastSemesters = lsGet(KEYS.cgpa + "_past", []);

function initCGPA() {
  document.getElementById("cgpaAddBtn").addEventListener("click", addCGPASubjectRow);
  document.getElementById("calcSGPA").addEventListener("click", calculateAndShowSGPA);
  document.getElementById("addSemBtn").addEventListener("click", addPastSemRow);
  document.getElementById("calcCGPA").addEventListener("click", calculateAndShowCGPA);

  // Render saved subjects if any
  cgpaSubjects.forEach(() => addCGPASubjectRow());
  restoreCGPASubjects();

  // Render past semesters
  pastSemesters.forEach(v => addPastSemRow(v));
}

/**
 * addCGPASubjectRow – Adds a new row to the subjects table.
 * Optionally pre-fills values from saved data.
 */
function addCGPASubjectRow() {
  const tbody = document.getElementById("cgpaBody");
  const rowId = "cgpar_" + Date.now();

  const tr = document.createElement("tr");
  tr.id    = rowId;
  tr.innerHTML = `
    <td><input type="text"   class="cgpa-name"   placeholder="e.g. DBMS" /></td>
    <td><input type="number" class="cgpa-credit" placeholder="4" min="1" max="6" /></td>
    <td><input type="number" class="cgpa-grade"  placeholder="8.5" min="0" max="10" step="0.1" /></td>
    <td>
      <button class="btn btn-danger" onclick="removeCGPARow('${rowId}')">
        <i class="ph ph-trash"></i>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
}

/**
 * removeCGPARow – Removes a subject row from the table.
 */
function removeCGPARow(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();
  saveCGPASubjects();
}

/**
 * calculateAndShowSGPA – Reads all table rows and computes SGPA.
 */
function calculateAndShowSGPA() {
  const rows = document.querySelectorAll("#cgpaBody tr");
  const subjects = [];

  rows.forEach(row => {
    const name   = row.querySelector(".cgpa-name")?.value.trim()    || "Subject";
    const credit = parseFloat(row.querySelector(".cgpa-credit")?.value) || 0;
    const grade  = parseFloat(row.querySelector(".cgpa-grade")?.value)  || 0;
    if (credit > 0) subjects.push({ name, credit, grade });
  });

  if (subjects.length === 0) {
    return showToast("Add at least one subject with credits.", "warn");
  }

  const sgpa = calculateSGPAValue(subjects);
  document.getElementById("sgpaResult").textContent = sgpa.toFixed(2);
  document.getElementById("statSGPA").textContent   = sgpa.toFixed(2);

  // Persist subject rows
  saveCGPASubjects(subjects);
  showToast("SGPA calculated!", "success");
}

/**
 * calculateSGPAValue – Pure function: returns SGPA number given subjects array.
 * @param {Array} subjects - [{credit, grade}, …]
 * @returns {number} SGPA
 */
function calculateSGPAValue(subjects) {
  if (!subjects || subjects.length === 0) return 0;
  const totalCredits = subjects.reduce((s, sub) => s + sub.credit, 0);
  if (totalCredits === 0) return 0;
  const weightedSum  = subjects.reduce((s, sub) => s + sub.credit * sub.grade, 0);
  return weightedSum / totalCredits;
}

/**
 * saveCGPASubjects – Persists the current semester subjects.
 */
function saveCGPASubjects(subjects) {
  if (!subjects) {
    // Read from DOM
    subjects = [];
    document.querySelectorAll("#cgpaBody tr").forEach(row => {
      const credit = parseFloat(row.querySelector(".cgpa-credit")?.value) || 0;
      const grade  = parseFloat(row.querySelector(".cgpa-grade")?.value)  || 0;
      const name   = row.querySelector(".cgpa-name")?.value.trim() || "";
      if (credit > 0) subjects.push({ name, credit, grade });
    });
  }
  lsSet(KEYS.cgpa + "_subs", subjects);
  cgpaSubjects = subjects;
}

/**
 * restoreCGPASubjects – Fills the table rows from saved data.
 */
function restoreCGPASubjects() {
  const saved = lsGet(KEYS.cgpa + "_subs", []);
  const tbody = document.getElementById("cgpaBody");
  tbody.innerHTML = ""; // clear first
  saved.forEach(sub => {
    addCGPASubjectRow();
    const rows = tbody.querySelectorAll("tr");
    const last = rows[rows.length - 1];
    last.querySelector(".cgpa-name").value   = sub.name;
    last.querySelector(".cgpa-credit").value = sub.credit;
    last.querySelector(".cgpa-grade").value  = sub.grade;
  });
}

/**
 * addPastSemRow – Adds an input for a past semester's SGPA.
 * @param {number} value - pre-fill value (optional)
 */
function addPastSemRow(value = "") {
  const container = document.getElementById("pastSemesters");
  const semNum    = container.children.length + 1;
  const rowId     = "psem_" + Date.now();

  const div = document.createElement("div");
  div.className = "past-sem-row";
  div.id        = rowId;
  div.innerHTML = `
    <label>Semester ${semNum}</label>
    <input type="number" min="0" max="10" step="0.01" placeholder="e.g. 8.2" value="${value}" />
    <button class="btn-icon" onclick="document.getElementById('${rowId}').remove(); savePastSems();">
      <i class="ph ph-trash" style="color:var(--red)"></i>
    </button>
  `;
  container.appendChild(div);
}

/**
 * calculateAndShowCGPA – Averages all semester SGPAs.
 */
function calculateAndShowCGPA() {
  // Collect past semester values
  const rows  = document.querySelectorAll("#pastSemesters .past-sem-row input");
  const sgpas = Array.from(rows).map(i => parseFloat(i.value)).filter(v => !isNaN(v) && v > 0);

  // Include current semester's SGPA if already calculated
  const currentSGPA = parseFloat(document.getElementById("sgpaResult").textContent);
  if (!isNaN(currentSGPA) && currentSGPA > 0) sgpas.push(currentSGPA);

  if (sgpas.length === 0) {
    return showToast("Enter at least one semester SGPA.", "warn");
  }

  const cgpa = sgpas.reduce((s, v) => s + v, 0) / sgpas.length;
  document.getElementById("cgpaResult").textContent = cgpa.toFixed(2);

  savePastSems();
  showToast("CGPA calculated!", "success");
}

/**
 * savePastSems – Saves the past semester SGPA values.
 */
function savePastSems() {
  const rows  = document.querySelectorAll("#pastSemesters .past-sem-row input");
  const sgpas = Array.from(rows).map(i => parseFloat(i.value) || "");
  lsSet(KEYS.cgpa + "_past", sgpas);
}


/* ═══════════════════════════════════════════════════════════════════
   12.  TASKS MODULE
   ──────────────────
   Data shape: array of { id, text, priority, done, createdAt }
═══════════════════════════════════════════════════════════════════ */

/** Active filter for the task list. */
let taskFilter = "all";

function initTasks() {
  // Add task button
  document.getElementById("addTaskBtn").addEventListener("click", addTask);

  // Also allow pressing Enter in the input box
  document.getElementById("taskInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
  });

  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      taskFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  renderTasks();
}

/**
 * addTask – Reads input and creates a new task.
 */
function addTask() {
  const text     = document.getElementById("taskInput").value.trim();
  const priority = document.getElementById("taskPriority").value;

  if (!text) return showToast("Please type a task first.", "warn");

  const tasks = lsGet(KEYS.tasks, []);
  tasks.unshift({               // unshift = add to beginning of array
    id:        Date.now(),
    text,
    priority,
    done:      false,
    createdAt: new Date().toLocaleDateString("en-IN"),
  });

  lsSet(KEYS.tasks, tasks);
  document.getElementById("taskInput").value = "";
  renderTasks();
  renderDashboard();
  showToast("Task added!", "success");
}

/**
 * renderTasks – Draws the task list filtered by current tab.
 */
function renderTasks() {
  const list  = document.getElementById("taskList");
  let   tasks = lsGet(KEYS.tasks, []);

  // Apply filter
  if (taskFilter === "pending") tasks = tasks.filter(t => !t.done);
  if (taskFilter === "done")    tasks = tasks.filter(t =>  t.done);
  if (taskFilter === "high")    tasks = tasks.filter(t =>  t.priority === "high");

  if (tasks.length === 0) {
    list.innerHTML = `<p class="empty-state">No tasks here. 🎉</p>`;
    return;
  }

  list.innerHTML = tasks.map(task => `
    <div class="task-item ${task.done ? "done" : ""}">
      <div class="task-check" onclick="toggleTask(${task.id})">
        ${task.done ? '<i class="ph-fill ph-check"></i>' : ""}
      </div>
      <span class="task-text">${escapeHtml(task.text)}</span>
      <span class="priority-dot ${task.priority}" title="${task.priority} priority"></span>
      <button class="btn-icon" onclick="deleteTask(${task.id})" title="Delete">
        <i class="ph ph-trash" style="color:var(--red)"></i>
      </button>
    </div>
  `).join("");
}

/**
 * toggleTask – Flips the done/pending state of a task.
 */
function toggleTask(id) {
  const tasks = lsGet(KEYS.tasks, []);
  const idx   = tasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    tasks[idx].done = !tasks[idx].done;
    lsSet(KEYS.tasks, tasks);
    renderTasks();
    renderDashboard();
  }
}

/**
 * deleteTask – Permanently removes a task.
 */
function deleteTask(id) {
  const tasks = lsGet(KEYS.tasks, []).filter(t => t.id !== id);
  lsSet(KEYS.tasks, tasks);
  renderTasks();
  renderDashboard();
  showToast("Task deleted.", "info");
}


/* ═══════════════════════════════════════════════════════════════════
   13.  MODAL HELPERS
   ───────────────────
   openModal / closeModal control the .open CSS class.
   We also wire up every .modal-close button here.
═══════════════════════════════════════════════════════════════════ */

function initModals() {
  // All close buttons carry a data-modal="<id>" attribute
  document.querySelectorAll(".modal-close, [data-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.modal;
      if (modalId) closeModal(modalId);
    });
  });

  // Close modal when clicking the dark overlay itself
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      // Only close if the click is directly on the overlay, not the modal card inside
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}


/* ═══════════════════════════════════════════════════════════════════
   14.  UTILITY FUNCTIONS
   ──────────────────────
   Small helpers used throughout the app.
═══════════════════════════════════════════════════════════════════ */

/**
 * getDayName – Returns the current day as "Monday", "Tuesday", etc.
 */
function getDayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

/**
 * getNowMs – Returns milliseconds since midnight for "right now".
 */
function getNowMs() {
  const n = new Date();
  return n.getHours() * 3600000 + n.getMinutes() * 60000 + n.getSeconds() * 1000;
}

/**
 * escapeHtml – Prevents XSS by encoding user-typed HTML characters.
 * Always use this when inserting user data into innerHTML.
 */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ── Toast Notification ──────────────────────────────────────── */

let toastTimeout = null;

/**
 * showToast – Shows a brief notification at the bottom of the screen.
 * @param {string} message - The text to show
 * @param {string} type    - "success" | "warn" | "info"
 */
function showToast(message, type = "info") {
  // Remove existing toast if any
  const existing = document.getElementById("cc-toast");
  if (existing) existing.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const colors = {
    success: "var(--green)",
    warn:    "var(--amber)",
    info:    "var(--accent)",
  };

  const toast = document.createElement("div");
  toast.id    = "cc-toast";
  toast.textContent = message;
  Object.assign(toast.style, {
    position:     "fixed",
    bottom:       "28px",
    right:        "28px",
    background:   "var(--bg-2)",
    color:        colors[type] || "var(--text)",
    border:       `1px solid ${colors[type] || "var(--glass-border)"}`,
    borderRadius: "10px",
    padding:      "12px 20px",
    fontSize:     "14px",
    fontWeight:   "600",
    boxShadow:    "0 8px 30px rgba(0,0,0,0.3)",
    zIndex:       "9999",
    animation:    "fadeSlideIn 0.25s ease",
    fontFamily:   "var(--font-body)",
  });

  document.body.appendChild(toast);

  // Auto-dismiss after 2.5 seconds
  toastTimeout = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
