# A Seat to Study
### Discovering and Sharing Study Spaces

## 1. Introduction
**A Seat to Study** is a simple, responsive college web project built to help students check available library seats, explore silent and collaborative study zones, and book individual seats online without installing any backend server or external database.

All initial study-space counts, demo student accounts, sample bookings, and example feedback entries are **illustrative sample data** stored in `data.js` and persisted dynamically in browser `localStorage` for demonstration purposes.

---

## 2. Problem Statement
> "Students often face difficulty finding suitable study spaces during busy academic periods. Some students prefer silent individual study, while others need collaborative spaces for group discussions. A Seat to Study aims to make finding suitable study spaces easier and more convenient."

---

## 3. Objectives
- Make study-space discovery easier for college students.
- Improve seat availability visibility across multiple library floors and rooms.
- Clearly separate **Silent Zone** (individual/exam study) and **Collaborative Zone** (group discussions).
- Simplify seat selection and booking with automatic duplicate/overlapping slot prevention.
- Allow students to manage or cancel bookings, automatically freeing seats again.
- Gather student feedback to improve the campus study experience.

---

## 4. Technologies Used
- **HTML5** — Semantic multi-page website structure
- **CSS3** — Professional blue-and-white theme with responsive layout for laptop and mobile
- **JavaScript (Vanilla JS)** — Interactive seat map, automatic availability math, auth guard, validation, and form handling
- **Browser LocalStorage** — Client-side persistence for student accounts, bookings, feedback, and contact messages

*(No React, Node.js, Python backend, APIs, or external databases are used.)*

---

## 5. Features
- **Home Page (`index.html`)**: Project introduction, problem statement, key benefits, live sample seat summary, and quick navigation.
- **Student Authentication (`login.html`, `signup.html`)**: Demo account credentials, new student registration stored in `localStorage`, student name display in the navbar, logout, and automatic protection of student pages.
- **Student Dashboard (`dashboard.html`)**: Automatically calculates Total Study Spaces (4), Total Seats (260), Available Seats, and Occupied Seats, alongside availability summaries, recent bookings, and zone cards.
- **Study Space Availability (`availability.html`)**: Displays all four spaces (Library Floor 1, Library Floor 2, Silent Reading Room, Group Discussion Room) with floor, total/available/occupied seats, occupancy percentages, status badges, zone filtering, and Book Now links.
- **Interactive Seat Selection (`seat-selection.html`)**: Color-coded seat grid (Green = Available, Red = Occupied, Blue = Selected) with realistic seat IDs (`G01`–`G100`, `F101`–`F180`, `R01`–`R50`, `D01`–`D30`) and instant booking confirmation.
- **Study Zones (`zones.html`)**: Dedicated Silent Zone and Collaborative Zone cards with usage rules and live space links.
- **Seat Booking System (`booking.html`)**: Full booking form with date/time-slot selection, overlapping time-slot duplicate prevention, confirmation summary, and real-time availability updates.
- **My Bookings (`my-bookings.html`)**: Lists the logged-in student's bookings with status badges, booking cancellation (which restores seat availability immediately), and an empty-state view when no bookings exist.
- **Feedback & Contact (`feedback.html`, `contact.html`)**: Rating (1–5) feedback form with illustrative sample reviews and a helpdesk contact form with submission confirmation.
- **Editable Sample Dataset (`data.js`)**: Separated configuration file for quick updates during demonstrations, plus a **Reset Demo Data** button in the footer.

---

## 6. Folder Structure
```text
A_Seat_To_Study/
├── index.html           # Home page
├── login.html           # Student login page
├── signup.html          # Student registration page
├── dashboard.html       # Student dashboard (protected)
├── availability.html    # Study space availability & overview table
├── seat-selection.html  # Interactive green/red seat grid (protected)
├── zones.html           # Silent Zone & Collaborative Zone info
├── booking.html         # Seat booking form & overlap validation (protected)
├── my-bookings.html     # User bookings & cancellation page (protected)
├── feedback.html        # Study space rating & feedback form
├── about.html           # Project introduction, objectives & benefits
├── contact.html         # Contact form & library helpdesk info
├── style.css            # Responsive blue & white stylesheet
├── data.js              # Editable sample dataset & configuration
├── script.js            # Core application & LocalStorage logic
└── README.md            # Project documentation
```

---

## 7. Instructions to Run the Project
### Option A: Using VS Code Live Server (Recommended)
1. Open the `A_Seat_To_Study` folder in **Visual Studio Code**.
2. Install/enable the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` and select **Open with Live Server**.
4. The website will open in your browser (typically at `http://127.0.0.1:5500/index.html`).

### Option B: Direct Browser Opening
1. Navigate to the `A_Seat_To_Study` folder in File Explorer.
2. Double-click `index.html` to open it directly in Chrome, Edge, or Firefox.

### Demo Login Credentials
- **Email:** `aarav.sharma@college.edu`
- **Password:** `student123`
*(Or click **Fill Demo Credentials** on `login.html`, or register a new student via `signup.html`.)*

---

## 8. Limitations
- **Client-Side Only (`localStorage`)**: Data is stored locally in the user's browser and does not sync across different devices or browsers.
- **Simulated Authentication**: Credentials are stored in plain `localStorage` for college demonstration simplicity and are not suitable for production security.
- **Static Baseline Occupancy**: Initial walk-in occupancy counts are illustrative sample figures defined in `data.js` rather than live IoT/RFID sensor feeds.

---

## 9. Future Scope
- **Backend & Database Integration**: Connect to a server API (e.g., Node.js/Express or Python/Django with PostgreSQL/MySQL) for multi-device synchronization.
- **Real-Time Occupancy Sensors**: Integrate library turnstile counts or desk sensors for live walk-in occupancy tracking.
- **QR Code Check-In**: Let students scan a desk QR code to confirm arrival and auto-release unverified bookings after 15 minutes.
- **Admin Analytics Panel**: Provide librarians with peak-hour heatmaps, space utilization trends, and seat maintenance controls.

