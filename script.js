const KEYS = {
  theme:      "cc_theme",
  timetable:  "cc_timetable",
  attendance: "cc_attendance",
  mess:       "cc_mess",
  tasks:      "cc_tasks",
  cgpa:       "cc_cgpa",
};

function lsGet(key, defaultVal = null) {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultVal;
  try { return JSON.parse(raw); } catch { return defaultVal; }
}

function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

//init
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(lsGet(KEYS.theme, "dark"));
  startClock();
  initNavigation();
  initMobileSidebar();
  initThemeToggle();
  renderDashboard();
  initTimetable();
  initAttendance();
  initMess();
  initCGPA();
  initTasks();
  initModals();
});

//navigation
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetSection = item.dataset.section;

      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");

      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      document.getElementById("section-" + targetSection).classList.add("active");

      if (targetSection === "dashboard") renderDashboard();
      closeMobileSidebar();
    });
  });
}

//sidebar for mobile
function initMobileSidebar() {
  const hamburger = document.getElementById("hamburger");
  const sidebar   = document.getElementById("sidebar");
  const overlay   = document.getElementById("sidebarOverlay");

  hamburger.addEventListener("click", () => {
    sidebar.classList.add("open");
    overlay.classList.add("active");
  });

  overlay.addEventListener("click", closeMobileSidebar);
}

function closeMobileSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("active");
}

//theme toggle
function initThemeToggle() {
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("themeToggleMobile").addEventListener("click", toggleTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next    = current === "dark" ? "light" : "dark";
  applyTheme(next);
  lsSet(KEYS.theme, next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);

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

//clock and date
function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();

  document.getElementById("liveClock").textContent = now.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });

  document.getElementById("liveDate").textContent = now.toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const hour = now.getHours();
  const greetEl = document.querySelector(".greeting-sub");
  if (greetEl) {
    if (hour < 12)       greetEl.textContent = "Good morning,";
    else if (hour < 17)  greetEl.textContent = "Good afternoon,";
    else                 greetEl.textContent = "Good evening,";
  }

  updateNextClassCountdown();
}

//dashboard
function renderDashboard() {
  const attendance = lsGet(KEYS.attendance, []);
  const tasks      = lsGet(KEYS.tasks, []);

  document.getElementById("statSubjects").textContent = attendance.length;

  if (attendance.length > 0) {
    const avg = attendance.reduce((sum, s) => {
      return sum + (s.total > 0 ? (s.present / s.total) * 100 : 0);
    }, 0) / attendance.length;
    document.getElementById("statAttendance").textContent = avg.toFixed(1) + "%";
  } else {
    document.getElementById("statAttendance").textContent = "–";
  }

  const done = tasks.filter(t => t.done).length;
  document.getElementById("statTasks").textContent = `${done}/${tasks.length}`;

  const cgpaSubs = lsGet(KEYS.cgpa + "_subs", []);
  const sgpaVal  = calculateSGPAValue(cgpaSubs);
  document.getElementById("statSGPA").textContent = sgpaVal > 0 ? sgpaVal.toFixed(2) : "–";

  renderDashboardAttendance(attendance);
  renderMessPreview();
}
//attendance preview on dashboard
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
// mess menu preview on dashboard
function renderMessPreview() {
  const dayName  = getDayName();
  const messData = lsGet(KEYS.mess, {});
  const today    = messData[dayName] || {};

  document.getElementById("prevBreakfast").textContent = today.breakfast || "Not set";
  document.getElementById("prevLunch").textContent     = today.lunch     || "Not set";
  document.getElementById("prevSnacks").textContent    = today.snacks    || "Not set";
  document.getElementById("prevDinner").textContent    = today.dinner    || "Not set";
}

//next class countdown on dashboard
function updateNextClassCountdown() {
  const timetable = lsGet(KEYS.timetable, []);
  const now       = new Date();
  const dayName   = getDayName();

  const todayClasses = timetable
    .filter(c => c.day === dayName)
    .map(c => ({ ...c, startMs: timeToMs(c.start), endMs: timeToMs(c.end) }))
    .sort((a, b) => a.startMs - b.startMs);

  const nowMs   = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000;
  const next    = todayClasses.find(c => c.startMs > nowMs);
  const ongoing = todayClasses.find(c => c.startMs <= nowMs && c.endMs > nowMs);

  const nameEl      = document.getElementById("nextClassName");
  const timeEl      = document.getElementById("nextClassTime");
  const countdownEl = document.getElementById("countdownTimer");

  if (!nameEl) return;

  if (ongoing) {
    nameEl.textContent      = "🟢 " + ongoing.subject + " (ongoing)";
    timeEl.textContent      = `${ongoing.start} – ${ongoing.end}  ${ongoing.room ? "| " + ongoing.room : ""}`;
    countdownEl.textContent = "Ends in " + formatCountdown(ongoing.endMs - nowMs);
  } else if (next) {
    nameEl.textContent      = next.subject;
    timeEl.textContent      = `${next.start} – ${next.end}  ${next.room ? "| " + next.room : ""}`;
    countdownEl.textContent = formatCountdown(next.startMs - nowMs);
  } else {
    nameEl.textContent      = "No more classes today 🎉";
    timeEl.textContent      = "";
    countdownEl.textContent = "–";
  }
}

function formatCountdown(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

function timeToMs(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 3600000 + m * 60000;
}

// timetable section
let currentTTDay = "Monday";

function initTimetable() {
  document.querySelectorAll(".day-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".day-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentTTDay = tab.dataset.day;
      renderTimetable();
    });
  });

  document.getElementById("ttAddBtn").addEventListener("click", () => openTTModal());
  document.getElementById("ttSaveBtn").addEventListener("click", saveTTEntry);
  document.getElementById("ttSearch").addEventListener("input", renderTimetable);

  renderTimetable();
}

function renderTimetable() {
  const grid        = document.getElementById("timetableGrid");
  const searchQuery = document.getElementById("ttSearch").value.toLowerCase().trim();
  const timetable   = lsGet(KEYS.timetable, []);

  let filtered = timetable.filter(c => c.day === currentTTDay);
  if (searchQuery) {
    filtered = filtered.filter(c =>
      c.subject.toLowerCase().includes(searchQuery) ||
      (c.faculty && c.faculty.toLowerCase().includes(searchQuery)) ||
      (c.room && c.room.toLowerCase().includes(searchQuery))
    );
  }

  filtered.sort((a, b) => timeToMs(a.start) - timeToMs(b.start));

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-state">No classes found. Try a different day or search term.</p>`;
    return;
  }

  const nowMs = getNowMs();
  const today = getDayName();

  grid.innerHTML = filtered.map(c => {
    const isOngoing   = c.day === today && timeToMs(c.start) <= nowMs && timeToMs(c.end) > nowMs;
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

function openTTModal(id = null) {
  const timetable = lsGet(KEYS.timetable, []);

  document.getElementById("ttEditIndex").value = id !== null ? id : -1;
  document.getElementById("ttSubject").value   = "";
  document.getElementById("ttStart").value     = "";
  document.getElementById("ttEnd").value       = "";
  document.getElementById("ttRoom").value      = "";
  document.getElementById("ttFaculty").value   = "";
  document.getElementById("ttDay").value       = currentTTDay;
  document.getElementById("ttModalTitle").textContent = id !== null ? "Edit Class" : "Add Class";

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

function saveTTEntry() {
  const subject = document.getElementById("ttSubject").value.trim();
  const start   = document.getElementById("ttStart").value;
  const end     = document.getElementById("ttEnd").value;

  if (!subject)       return showToast("Please enter a subject name.", "warn");
  if (!start || !end) return showToast("Please set start and end times.", "warn");
  if (start >= end)   return showToast("End time must be after start time.", "warn");

  const timetable = lsGet(KEYS.timetable, []);
  const editId    = parseInt(document.getElementById("ttEditIndex").value);

  const entry = {
    id:      editId !== -1 ? editId : Date.now(),
    day:     document.getElementById("ttDay").value,
    subject,
    start,
    end,
    room:    document.getElementById("ttRoom").value.trim(),
    faculty: document.getElementById("ttFaculty").value.trim(),
  };

  if (editId !== -1) {
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

function deleteTTEntry(id) {
  if (!confirm("Delete this class?")) return;
  lsSet(KEYS.timetable, lsGet(KEYS.timetable, []).filter(c => c.id !== id));
  renderTimetable();
  renderDashboard();
  showToast("Class removed.", "info");
}


function initAttendance() {
  document.getElementById("attAddBtn").addEventListener("click", () => openModal("attModal"));
  document.getElementById("attSaveBtn").addEventListener("click", saveAttSubject);
  renderAttendance();
}

function renderAttendance() {
  const list       = document.getElementById("attendanceList");
  const warning    = document.getElementById("attendanceWarning");
  const attendance = lsGet(KEYS.attendance, []);

  if (attendance.length === 0) {
    list.innerHTML = `<p class="empty-state">No subjects yet. Click "Add Subject" to start tracking.</p>`;
    warning.style.display = "none";
    return;
  }

  const avg = attendance.reduce((sum, s) => {
    return sum + (s.total > 0 ? (s.present / s.total) * 100 : 0);
  }, 0) / attendance.length;

  warning.style.display = avg < 75 ? "flex" : "none";

  list.innerHTML = attendance.map(sub => {
    const pct    = sub.total > 0 ? Math.min(100, (sub.present / sub.total) * 100) : 0;
    const cls    = pct >= 75 ? "good" : pct >= 60 ? "warn" : "bad";
    const isLow  = pct < 75;
    const needed = calcClassesNeeded(sub.present, sub.total);

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

function saveAttSubject() {
  const name    = document.getElementById("attSubject").value.trim();
  const present = parseInt(document.getElementById("attPresent").value) || 0;
  const total   = parseInt(document.getElementById("attTotal").value)   || 0;

  if (!name)           return showToast("Please enter a subject name.", "warn");
  if (total < present) return showToast("Total classes can't be less than attended.", "warn");

  const attendance = lsGet(KEYS.attendance, []);
  attendance.push({ id: Date.now(), name, present, total });
  lsSet(KEYS.attendance, attendance);

  document.getElementById("attSubject").value = "";
  document.getElementById("attPresent").value = "0";
  document.getElementById("attTotal").value   = "0";

  closeModal("attModal");
  renderAttendance();
  renderDashboard();
  showToast("Subject added!", "success");
}

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

function deleteAttSubject(id) {
  if (!confirm("Remove this subject from attendance tracking?")) return;
  lsSet(KEYS.attendance, lsGet(KEYS.attendance, []).filter(s => s.id !== id));
  renderAttendance();
  renderDashboard();
  showToast("Subject removed.", "info");
}

// (present + x) / (total + x) >= 0.75
function calcClassesNeeded(present, total) {
  if (total === 0 || present / total >= 0.75) return 0;
  return Math.ceil((0.75 * total - present) / 0.25);
}

// present / (total + x) >= 0.75
function calcCanSkip(present, total) {
  return Math.max(0, Math.floor(present / 0.75 - total));
}


let currentMessDay = getDayName();

function initMess() {
  const select = document.getElementById("messDay");
  select.value = currentMessDay;

  select.addEventListener("change", () => {
    currentMessDay = select.value;
    renderMess();
  });

  document.getElementById("messEditBtn").addEventListener("click", openMessModal);
  document.getElementById("messSaveBtn").addEventListener("click", saveMessMenu);

  renderMess();
}

function renderMess() {
  const grid = document.getElementById("messGrid");
  const day  = (lsGet(KEYS.mess, {}))[currentMessDay] || {};

  const meals = [
    { key: "breakfast", emoji: "🍳", label: "Breakfast" },
    { key: "lunch",     emoji: "🍱", label: "Lunch"     },
    { key: "snacks",    emoji: "🫖", label: "Snacks"    },
    { key: "dinner",    emoji: "🌙", label: "Dinner"    },
  ];

  grid.innerHTML = meals.map(m => `
    <div class="mess-card">
      <div class="mess-meal-header">
        <span class="mess-meal-emoji">${m.emoji}</span>
        <span class="mess-meal-title">${m.label}</span>
      </div>
      <div class="mess-meal-content">
        ${escapeHtml(day[m.key] || "Not set")}
      </div>
    </div>
  `).join("");
}

function openMessModal() {
  const day = (lsGet(KEYS.mess, {}))[currentMessDay] || {};

  document.getElementById("messModalTitle").textContent = `Edit Menu — ${currentMessDay}`;
  document.getElementById("messBreakfast").value = day.breakfast || "";
  document.getElementById("messLunch").value     = day.lunch     || "";
  document.getElementById("messSnacks").value    = day.snacks    || "";
  document.getElementById("messDinner").value    = day.dinner    || "";

  openModal("messModal");
}

function saveMessMenu() {
  const data = lsGet(KEYS.mess, {});

  data[currentMessDay] = {
    breakfast: document.getElementById("messBreakfast").value.trim(),
    lunch:     document.getElementById("messLunch").value.trim(),
    snacks:    document.getElementById("messSnacks").value.trim(),
    dinner:    document.getElementById("messDinner").value.trim(),
  };

  lsSet(KEYS.mess, data);
  closeModal("messModal");
  renderMess();
  renderMessPreview();
  showToast("Menu saved!", "success");
}


let cgpaSubjects  = lsGet(KEYS.cgpa + "_subs", []);
let pastSemesters = lsGet(KEYS.cgpa + "_past", []);

function initCGPA() {
  document.getElementById("cgpaAddBtn").addEventListener("click", addCGPASubjectRow);
  document.getElementById("calcSGPA").addEventListener("click", calculateAndShowSGPA);
  document.getElementById("addSemBtn").addEventListener("click", () => addPastSemRow());
  document.getElementById("calcCGPA").addEventListener("click", calculateAndShowCGPA);

  restoreCGPASubjects();
  pastSemesters.forEach(v => addPastSemRow(v));
}

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

function removeCGPARow(rowId) {
  document.getElementById(rowId)?.remove();
  saveCGPASubjects();
}

function calculateAndShowSGPA() {
  const subjects = [];

  document.querySelectorAll("#cgpaBody tr").forEach(row => {
    const name   = row.querySelector(".cgpa-name")?.value.trim() || "Subject";
    const credit = parseFloat(row.querySelector(".cgpa-credit")?.value) || 0;
    const grade  = parseFloat(row.querySelector(".cgpa-grade")?.value)  || 0;
    if (credit > 0) subjects.push({ name, credit, grade });
  });

  if (subjects.length === 0) return showToast("Add at least one subject with credits.", "warn");

  const sgpa = calculateSGPAValue(subjects);
  document.getElementById("sgpaResult").textContent = sgpa.toFixed(2);
  document.getElementById("statSGPA").textContent   = sgpa.toFixed(2);

  saveCGPASubjects(subjects);
  showToast("SGPA calculated!", "success");
}

function calculateSGPAValue(subjects) {
  if (!subjects || subjects.length === 0) return 0;
  const totalCredits = subjects.reduce((s, sub) => s + sub.credit, 0);
  if (totalCredits === 0) return 0;
  return subjects.reduce((s, sub) => s + sub.credit * sub.grade, 0) / totalCredits;
}

function saveCGPASubjects(subjects) {
  if (!subjects) {
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

function restoreCGPASubjects() {
  const saved = lsGet(KEYS.cgpa + "_subs", []);
  const tbody = document.getElementById("cgpaBody");
  tbody.innerHTML = "";
  saved.forEach(sub => {
    addCGPASubjectRow();
    const last = tbody.querySelectorAll("tr")[tbody.querySelectorAll("tr").length - 1];
    last.querySelector(".cgpa-name").value   = sub.name;
    last.querySelector(".cgpa-credit").value = sub.credit;
    last.querySelector(".cgpa-grade").value  = sub.grade;
  });
}

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

function calculateAndShowCGPA() {
  const rows  = document.querySelectorAll("#pastSemesters .past-sem-row input");
  const sgpas = Array.from(rows).map(i => parseFloat(i.value)).filter(v => !isNaN(v) && v > 0);

  const currentSGPA = parseFloat(document.getElementById("sgpaResult").textContent);
  if (!isNaN(currentSGPA) && currentSGPA > 0) sgpas.push(currentSGPA);

  if (sgpas.length === 0) return showToast("Enter at least one semester SGPA.", "warn");

  document.getElementById("cgpaResult").textContent = (sgpas.reduce((s, v) => s + v, 0) / sgpas.length).toFixed(2);
  savePastSems();
  showToast("CGPA calculated!", "success");
}

function savePastSems() {
  const rows = document.querySelectorAll("#pastSemesters .past-sem-row input");
  lsSet(KEYS.cgpa + "_past", Array.from(rows).map(i => parseFloat(i.value) || ""));
}


let taskFilter = "all";

function initTasks() {
  document.getElementById("addTaskBtn").addEventListener("click", addTask);
  document.getElementById("taskInput").addEventListener("keydown", e => {
    if (e.key === "Enter") addTask();
  });

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

function addTask() {
  const text     = document.getElementById("taskInput").value.trim();
  const priority = document.getElementById("taskPriority").value;

  if (!text) return showToast("Please type a task first.", "warn");

  const tasks = lsGet(KEYS.tasks, []);
  tasks.unshift({
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

function renderTasks() {
  const list = document.getElementById("taskList");
  let tasks  = lsGet(KEYS.tasks, []);

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

function deleteTask(id) {
  lsSet(KEYS.tasks, lsGet(KEYS.tasks, []).filter(t => t.id !== id));
  renderTasks();
  renderDashboard();
  showToast("Task deleted.", "info");
}


function initModals() {
  document.querySelectorAll(".modal-close, [data-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.modal;
      if (modalId) closeModal(modalId);
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function openModal(id)  { document.getElementById(id).classList.add("open");    }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }


function getDayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function getNowMs() {
  const n = new Date();
  return n.getHours() * 3600000 + n.getMinutes() * 60000 + n.getSeconds() * 1000;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


let toastTimeout = null;

function showToast(message, type = "info") {
  document.getElementById("cc-toast")?.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const colors = { success: "var(--green)", warn: "var(--amber)", info: "var(--accent)" };

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

  toastTimeout = setTimeout(() => {
    toast.style.opacity    = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
