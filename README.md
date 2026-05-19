# 🎓 Campus Companion

A modern, feature-rich dashboard web application for engineering college students.
Built with **pure HTML, CSS, and vanilla JavaScript** — no frameworks, no dependencies.

> Built by **Sohum Sardana**

---

## 📸 Features at a Glance

| Feature | Description |
|---|---|
| 🏠 Dashboard | Live clock, greeting, quick stats, class countdown, mess preview |
| 📅 Timetable | Weekly schedule with add/edit/delete, live class highlight |
| 📊 Attendance | Track per-subject attendance with smart warnings |
| 🍽️ Mess Menu | Day-wise meal cards, editable, persisted |
| 🎓 SGPA/CGPA | Calculator with multi-semester CGPA estimator |
| ✅ Tasks | Priority tasks with filters and completion tracking |
| 🌗 Dark/Light | Smooth theme toggle persisted across sessions |

---

## 📁 Folder Structure

```
campus-companion/
│
├── index.html       ← All HTML: structure, sections, modals
├── style.css        ← All styles: theme variables, layout, cards, responsive
├── script.js        ← All JavaScript: data, logic, rendering, localStorage
├── README.md        ← This file
└── assets/          ← (Optional) Place any images or icons here
```

### Why this structure?

- **Single HTML file**: Keeps all sections in one place; sections are hidden/shown by JS.
- **Single CSS file**: Global design tokens (CSS variables) at the top make theming easy.
- **Single JS file**: Organised into clearly labelled sections with comments — beginner friendly.
- **No build tools needed**: Just open `index.html` in a browser and it works.

---

## 🚀 How to Run

1. Download or clone this folder.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. That's it — no server, no npm, no installation required.

---

## 💾 How localStorage Works in This Project

`localStorage` is a browser API that stores data as **key-value pairs** on your computer.
The data **persists even after closing the tab** — unlike regular JS variables.

### Keys used

| Key | What it stores |
|---|---|
| `cc_theme` | `"dark"` or `"light"` |
| `cc_timetable` | Array of class objects (day, subject, time, room, faculty) |
| `cc_attendance` | Array of subjects (name, present count, total count) |
| `cc_mess` | Object with day → meal strings |
| `cc_tasks` | Array of task objects (text, priority, done status) |
| `cc_cgpa_subs` | Array of current semester subjects for SGPA |
| `cc_cgpa_past` | Array of past semester SGPA values |

### The helper functions (in script.js)

```js
// Read from localStorage (with a fallback default value)
function lsGet(key, defaultVal) {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultVal;
  return JSON.parse(raw);   // converts string → JS object/array
}

// Write to localStorage
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value)); // converts object → string
}
```

**Why JSON?** localStorage only stores strings.
`JSON.stringify()` turns objects/arrays into strings before saving;
`JSON.parse()` turns them back into objects when reading.

### Example flow

```
User marks attendance → markAttendance() runs →
reads array from localStorage → updates present count →
writes array back → re-renders the cards on screen
```

---

## 🔁 5 Improvements to Convert to React Later

1. **Component-based architecture**
   Replace each module (Timetable, Attendance, etc.) with its own `.jsx` component file.
   This gives you clean separation of concerns and easy reuse.

2. **useState / useReducer for state management**
   Replace the `lsGet/lsSet` calls scattered in functions with React state hooks.
   Use `useReducer` for complex state like attendance subjects.

3. **useEffect for localStorage sync**
   Use `useEffect(() => { lsSet(key, state); }, [state])` to auto-sync state to
   localStorage whenever it changes — cleaner than calling `lsSet` manually everywhere.

4. **React Router for navigation**
   Replace the manual section show/hide logic with `react-router-dom`.
   Each section becomes its own route (`/dashboard`, `/timetable`, etc.).

5. **Context API or Zustand for global state**
   The dashboard pulls data from timetable, attendance, tasks, and mess.
   In React, use a Context provider or Zustand store so any component can
   read/update shared state without prop drilling.


---

## 🛠️ Tech Stack

- **HTML5** — Semantic markup, ARIA-friendly structure
- **CSS3** — Custom properties, Grid, Flexbox, glassmorphism, animations
- **Vanilla JS (ES6+)** — Modules pattern, arrow functions, template literals, localStorage
- **Google Fonts** — Sora (display) + DM Sans (body)
- **Phosphor Icons** — Lightweight icon set via CDN

---

## 📄 License

Free to use for personal and educational projects.
Please credit **Sohum Sardana** if you use or showcase this project.
