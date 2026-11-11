/* ============================================================================
   A Seat to Study - Application Logic (script.js)
   Handles authentication, dynamic availability math, seat selection,
   booking & duplicate-slot prevention, cancellations, feedback, and UI.
   ============================================================================ */

(function (global) {
  "use strict";

  var DATA = global.SEAT_STUDY_DATA;

  var STORAGE_KEYS = {
    USERS: "seatStudy_users",
    CURRENT_USER: "seatStudy_currentUser",
    BOOKINGS: "seatStudy_bookings",
    FEEDBACK: "seatStudy_feedback",
    CONTACTS: "seatStudy_contacts"
  };

  var PROTECTED_PAGES = [
    "dashboard.html",
    "seat-selection.html",
    "booking.html",
    "my-bookings.html"
  ];

  /* --------------------------------------------------------------------------
     Utility & Storage Helpers
     -------------------------------------------------------------------------- */
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readStorage(key, fallbackValue) {
    try {
      var raw = global.localStorage.getItem(key);
      if (raw === null) {
        return fallbackValue;
      }
      return JSON.parse(raw);
    } catch (err) {
      return fallbackValue;
    }
  }

  function writeStorage(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function cloneArray(arr) {
    return JSON.parse(JSON.stringify(arr));
  }

  function ensureInitialData() {
    if (global.localStorage.getItem(STORAGE_KEYS.USERS) === null) {
      writeStorage(STORAGE_KEYS.USERS, cloneArray(DATA.DEMO_USERS));
    }
    if (global.localStorage.getItem(STORAGE_KEYS.BOOKINGS) === null) {
      writeStorage(STORAGE_KEYS.BOOKINGS, cloneArray(DATA.DEFAULT_BOOKINGS));
    }
    if (global.localStorage.getItem(STORAGE_KEYS.FEEDBACK) === null) {
      writeStorage(STORAGE_KEYS.FEEDBACK, cloneArray(DATA.DEFAULT_FEEDBACK));
    }
  }

  function resetDemoData() {
    writeStorage(STORAGE_KEYS.USERS, cloneArray(DATA.DEMO_USERS));
    writeStorage(STORAGE_KEYS.BOOKINGS, cloneArray(DATA.DEFAULT_BOOKINGS));
    writeStorage(STORAGE_KEYS.FEEDBACK, cloneArray(DATA.DEFAULT_FEEDBACK));
    global.localStorage.removeItem(STORAGE_KEYS.CONTACTS);

    var currentUser = getCurrentUser();
    if (currentUser) {
      var stillExists = DATA.DEMO_USERS.some(function (u) {
        return u.email.toLowerCase() === currentUser.email.toLowerCase();
      });
      if (!stillExists) {
        global.localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    }
    global.location.reload();
  }

  function getCurrentFileName() {
    var path = global.location.pathname || "";
    var file = path.substring(path.lastIndexOf("/") + 1);
    return file || "index.html";
  }

  function getUrlParam(name) {
    var params = new URLSearchParams(global.location.search);
    return params.get(name);
  }

  function getSafeRedirectTarget(rawTarget) {
    if (!rawTarget) {
      return "dashboard.html";
    }
    var trimmed = rawTarget.trim();
    if (/^[a-zA-Z0-9_-]+\.html(\?[a-zA-Z0-9_=&%+.-]*)?$/.test(trimmed)) {
      return trimmed;
    }
    return "dashboard.html";
  }

  function formatDisplayDate(isoDate) {
    if (!isoDate) return "";
    var parts = isoDate.split("-");
    if (parts.length !== 3) return isoDate;
    var months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    var year = parts[0];
    var monthIndex = parseInt(parts[1], 10) - 1;
    var day = parts[2];
    if (months[monthIndex]) {
      return day + " " + months[monthIndex] + " " + year;
    }
    return isoDate;
  }

  /* --------------------------------------------------------------------------
     Authentication & Access Control
     -------------------------------------------------------------------------- */
  function getUsers() {
    return readStorage(STORAGE_KEYS.USERS, cloneArray(DATA.DEMO_USERS));
  }

  function getCurrentUser() {
    return readStorage(STORAGE_KEYS.CURRENT_USER, null);
  }

  function loginUser(email, password) {
    var cleanEmail = (email || "").trim().toLowerCase();
    var users = getUsers();
    var found = null;

    for (var i = 0; i < users.length; i++) {
      if (users[i].email.toLowerCase() === cleanEmail && users[i].password === password) {
        found = users[i];
        break;
      }
    }

    if (!found) {
      return { ok: false, error: "Invalid email address or password. Please try again." };
    }

    var sessionUser = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role || "Student"
    };
    writeStorage(STORAGE_KEYS.CURRENT_USER, sessionUser);
    return { ok: true, user: sessionUser };
  }

  function registerUser(name, email, password, confirmPassword) {
    var cleanName = (name || "").trim();
    var cleanEmail = (email || "").trim().toLowerCase();

    if (cleanName.length < 2) {
      return { ok: false, error: "Please enter your full name (at least 2 characters)." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, error: "Please enter a valid email address." };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters long." };
    }
    if (password !== confirmPassword) {
      return { ok: false, error: "Passwords do not match. Please confirm your password." };
    }

    var users = getUsers();
    var duplicate = users.some(function (u) {
      return u.email.toLowerCase() === cleanEmail;
    });
    if (duplicate) {
      return {
        ok: false,
        error: "An account with this email address already exists. Please log in instead."
      };
    }

    var newUser = {
      id: "stu-" + Date.now(),
      name: cleanName,
      email: cleanEmail,
      password: password,
      role: "Student",
      createdAt: DATA.getTodayDateString()
    };
    users.push(newUser);
    writeStorage(STORAGE_KEYS.USERS, users);
    return { ok: true, user: newUser };
  }

  function logoutUser() {
    global.localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    global.location.href = "login.html?loggedOut=1";
  }

  function enforceAuthOnProtectedPage() {
    var currentFile = getCurrentFileName();
    if (PROTECTED_PAGES.indexOf(currentFile) !== -1 && !getCurrentUser()) {
      document.documentElement.style.visibility = "hidden";
      var target = currentFile + (global.location.search || "");
      global.location.replace("login.html?authRequired=1&next=" + encodeURIComponent(target));
      return false;
    }
    return true;
  }

  /* --------------------------------------------------------------------------
     Study Space Availability & Booking Logic
     -------------------------------------------------------------------------- */
  function getBookings() {
    return readStorage(STORAGE_KEYS.BOOKINGS, cloneArray(DATA.DEFAULT_BOOKINGS));
  }

  function saveBookings(bookings) {
    writeStorage(STORAGE_KEYS.BOOKINGS, bookings);
  }

  function getSpaceById(spaceId) {
    for (var i = 0; i < DATA.STUDY_SPACES.length; i++) {
      if (DATA.STUDY_SPACES[i].id === spaceId) {
        return DATA.STUDY_SPACES[i];
      }
    }
    return null;
  }

  function getTimeSlotByLabel(label) {
    for (var i = 0; i < DATA.TIME_SLOTS.length; i++) {
      if (DATA.TIME_SLOTS[i].label === label) {
        return DATA.TIME_SLOTS[i];
      }
    }
    return null;
  }

  function doSlotsOverlap(slotLabelA, slotLabelB) {
    if (slotLabelA === slotLabelB) return true;
    var slotA = getTimeSlotByLabel(slotLabelA);
    var slotB = getTimeSlotByLabel(slotLabelB);
    if (!slotA || !slotB) return false;
    return slotA.startMin < slotB.endMin && slotB.startMin < slotA.endMin;
  }

  /**
   * Computes live mathematical statistics for a single study space.
   * Distinct seats occupied = baseOccupiedSeats U active Confirmed bookings.
   */
  function getSpaceStats(space) {
    var bookings = getBookings();
    var occupiedMap = {};

    space.baseOccupiedSeats.forEach(function (seatId) {
      occupiedMap[seatId] = true;
    });

    bookings.forEach(function (booking) {
      if (booking.spaceId === space.id && booking.status === "Confirmed") {
        occupiedMap[booking.seatId] = true;
      }
    });

    var occupiedSeats = Math.min(space.totalSeats, Object.keys(occupiedMap).length);
    var availableSeats = Math.max(0, space.totalSeats - occupiedSeats);
    var occupancyPercent =
      space.totalSeats > 0 ? Math.round((occupiedSeats / space.totalSeats) * 100) : 0;

    var statusLabel = "Available";
    var statusBadgeClass = "badge-green";
    var progressClass = "progress-fill--low";

    if (availableSeats === 0) {
      statusLabel = "Full";
      statusBadgeClass = "badge-red";
      progressClass = "progress-fill--full";
    } else if (occupancyPercent >= 75) {
      statusLabel = "Limited Seats";
      statusBadgeClass = "badge-amber";
      progressClass = "progress-fill--high";
    } else if (occupancyPercent >= 60) {
      statusLabel = "Moderate";
      statusBadgeClass = "badge-blue";
      progressClass = "";
    }

    return {
      space: space,
      totalSeats: space.totalSeats,
      occupiedSeats: occupiedSeats,
      availableSeats: availableSeats,
      occupancyPercent: occupancyPercent,
      statusLabel: statusLabel,
      statusBadgeClass: statusBadgeClass,
      progressClass: progressClass
    };
  }

  function getAllSpacesWithStats() {
    return DATA.STUDY_SPACES.map(getSpaceStats);
  }

  function getSummaryStats() {
    var spacesStats = getAllSpacesWithStats();
    var totalSpaces = spacesStats.length;
    var totalSeats = 0;
    var availableSeats = 0;
    var occupiedSeats = 0;

    spacesStats.forEach(function (item) {
      totalSeats += item.totalSeats;
      availableSeats += item.availableSeats;
      occupiedSeats += item.occupiedSeats;
    });

    var overallOccupancyPercent =
      totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

    return {
      totalSpaces: totalSpaces,
      totalSeats: totalSeats,
      availableSeats: availableSeats,
      occupiedSeats: occupiedSeats,
      overallOccupancyPercent: overallOccupancyPercent,
      spaces: spacesStats
    };
  }

  /**
   * Checks whether a specific seat in a space is occupied for a given date & slot.
   */
  function getSeatStatusForSlot(space, seatId, date, timeSlotLabel) {
    if (space.baseOccupiedSeats.indexOf(seatId) !== -1) {
      return {
        occupied: true,
        source: "baseline",
        reason: "Currently occupied by walk-in library seating."
      };
    }

    var bookings = getBookings();
    for (var i = 0; i < bookings.length; i++) {
      var b = bookings[i];
      if (
        b.status === "Confirmed" &&
        b.spaceId === space.id &&
        b.seatId === seatId &&
        b.date === date &&
        doSlotsOverlap(b.timeSlot, timeSlotLabel)
      ) {
        return {
          occupied: true,
          source: "booking",
          booking: b,
          reason:
            "Seat " +
            seatId +
            " is already booked on " +
            formatDisplayDate(date) +
            " for an overlapping time slot (" +
            b.timeSlot +
            ")."
        };
      }
    }

    return { occupied: false, source: null, reason: "" };
  }

  /**
   * Creates and persists a new confirmed seat booking after validation.
   */
  function createBooking(params) {
    var user = getCurrentUser();
    if (!user) {
      return { ok: false, error: "Please log in before confirming a seat booking." };
    }

    var space = getSpaceById(params.spaceId);
    if (!space) {
      return { ok: false, error: "Please select a valid study space." };
    }

    if (!params.seatId || space.seats.indexOf(params.seatId) === -1) {
      return { ok: false, error: "Please select a valid seat number." };
    }

    var today = DATA.getTodayDateString();
    if (!params.date || params.date < today) {
      return { ok: false, error: "Please choose today or an upcoming date for your booking." };
    }

    if (!params.timeSlot || !getTimeSlotByLabel(params.timeSlot)) {
      return { ok: false, error: "Please choose a valid time slot." };
    }

    var seatCheck = getSeatStatusForSlot(space, params.seatId, params.date, params.timeSlot);
    if (seatCheck.occupied) {
      return {
        ok: false,
        error: "Duplicate booking prevented: " + seatCheck.reason + " Please pick another green seat or non-overlapping time slot."
      };
    }

    var bookings = getBookings();
    var randomDigits = Math.floor(1000 + Math.random() * 9000);
    var newBooking = {
      id: "BK-" + randomDigits,
      studentName: user.name,
      studentEmail: user.email,
      spaceId: space.id,
      spaceName: space.name,
      floor: space.floor,
      seatId: params.seatId,
      date: params.date,
      timeSlot: params.timeSlot,
      status: "Confirmed",
      isSample: false,
      createdAt: today
    };

    bookings.unshift(newBooking);
    saveBookings(bookings);
    return { ok: true, booking: newBooking };
  }

  function cancelBookingById(bookingId) {
    var user = getCurrentUser();
    if (!user) return false;

    var bookings = getBookings();
    var updated = false;

    for (var i = 0; i < bookings.length; i++) {
      if (
        bookings[i].id === bookingId &&
        bookings[i].studentEmail.toLowerCase() === user.email.toLowerCase() &&
        bookings[i].status === "Confirmed"
      ) {
        bookings[i].status = "Cancelled";
        updated = true;
        break;
      }
    }

    if (updated) {
      saveBookings(bookings);
    }
    return updated;
  }

  function removeCancelledBookingById(bookingId) {
    var user = getCurrentUser();
    if (!user) return false;

    var bookings = getBookings();
    var filtered = bookings.filter(function (b) {
      var isOwnedCancelled =
        b.id === bookingId &&
        b.studentEmail.toLowerCase() === user.email.toLowerCase() &&
        b.status === "Cancelled";
      return !isOwnedCancelled;
    });

    if (filtered.length !== bookings.length) {
      saveBookings(filtered);
      return true;
    }
    return false;
  }

  /* --------------------------------------------------------------------------
     Shared Header & Footer Injection
     -------------------------------------------------------------------------- */
  function getBrandIconSvg() {
    return (
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>' +
      '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>' +
      "</svg>"
    );
  }

  function renderHeader() {
    var headerEl = document.getElementById("site-header");
    if (!headerEl) return;

    var currentFile = getCurrentFileName();
    var user = getCurrentUser();

    var navItems = [
      { href: "index.html", label: "Home" },
      { href: "dashboard.html", label: "Dashboard" },
      { href: "availability.html", label: "Availability" },
      { href: "seat-selection.html", label: "Select Seat" },
      { href: "zones.html", label: "Study Zones" },
      { href: "booking.html", label: "Book Seat" },
      { href: "my-bookings.html", label: "My Bookings" },
      { href: "feedback.html", label: "Feedback" },
      { href: "about.html", label: "About" },
      { href: "contact.html", label: "Contact" }
    ];

    var linksHtml = navItems
      .map(function (item) {
        var activeClass = currentFile === item.href ? " active" : "";
        return (
          '<li><a class="nav-link' +
          activeClass +
          '" href="' +
          item.href +
          '">' +
          item.label +
          "</a></li>"
        );
      })
      .join("");

    var authHtml = "";
    if (user) {
      authHtml =
        '<span class="user-pill" title="Signed in student">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>' +
        "</svg>" +
        escapeHtml(user.name) +
        "</span>" +
        '<button type="button" id="logout-btn" class="btn btn-sm btn-subtle">Logout</button>';
    } else {
      authHtml =
        '<a href="login.html" class="btn btn-sm btn-secondary">Login</a>' +
        '<a href="signup.html" class="btn btn-sm btn-primary">Sign Up</a>';
    }

    headerEl.innerHTML =
      '<div class="container">' +
      '  <nav class="navbar" aria-label="Main Navigation">' +
      '    <a class="brand" href="index.html">' +
      '      <span class="brand-icon">' + getBrandIconSvg() + "</span>" +
      "      <span>A Seat to Study</span>" +
      "    </a>" +
      '    <button type="button" id="nav-toggle" class="nav-toggle" aria-expanded="false" aria-controls="nav-collapse">' +
      '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '        <line x1="3" y1="6" x2="21" y2="6"></line>' +
      '        <line x1="3" y1="12" x2="21" y2="12"></line>' +
      '        <line x1="3" y1="18" x2="21" y2="18"></line>' +
      "      </svg>" +
      "      Menu" +
      "    </button>" +
      '    <div class="nav-collapse" id="nav-collapse">' +
      '      <ul class="nav-links">' + linksHtml + "</ul>" +
      '      <div class="nav-auth">' + authHtml + "</div>" +
      "    </div>" +
      "  </nav>" +
      "</div>";

    var toggleBtn = document.getElementById("nav-toggle");
    var collapseEl = document.getElementById("nav-collapse");
    if (toggleBtn && collapseEl) {
      toggleBtn.addEventListener("click", function () {
        var isOpen = collapseEl.classList.toggle("open");
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
      });
    }

    var logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logoutUser);
    }
  }

  function renderFooter() {
    var footerEl = document.getElementById("site-footer");
    if (!footerEl) return;

    footerEl.innerHTML =
      '<div class="container">' +
      '  <div class="footer-grid">' +
      "    <div>" +
      '      <div class="footer-brand">A Seat to Study</div>' +
      "      <p style=\"font-size:0.88rem; margin-bottom:0.6rem;\">Discovering and sharing college library study spaces, silent reading rooms, and collaborative discussion areas.</p>" +
      '      <p style="font-size:0.8rem; color:#94a3b8; margin-bottom:0;"><strong>Prototype Note:</strong> Seat statistics, bookings, and feedback shown on initial load are illustrative sample data stored in browser LocalStorage (not empirical field research).</p>' +
      "    </div>" +
      "    <div>" +
      "      <h4>Explore Spaces</h4>" +
      '      <ul class="footer-links">' +
      '        <li><a href="availability.html">Study Space Availability</a></li>' +
      '        <li><a href="zones.html">Silent &amp; Collaborative Zones</a></li>' +
      '        <li><a href="seat-selection.html">Interactive Seat Map</a></li>' +
      '        <li><a href="booking.html">Book a Study Seat</a></li>' +
      "      </ul>" +
      "    </div>" +
      "    <div>" +
      "      <h4>Project &amp; Support</h4>" +
      '      <ul class="footer-links">' +
      '        <li><a href="dashboard.html">Student Dashboard</a></li>' +
      '        <li><a href="my-bookings.html">My Bookings</a></li>' +
      '        <li><a href="feedback.html">Student Feedback</a></li>' +
      '        <li><a href="about.html">About Project</a></li>' +
      '        <li><a href="contact.html">Contact Library Desk</a></li>' +
      "      </ul>" +
      "    </div>" +
      "  </div>" +
      '  <div class="footer-bottom">' +
      "    <span>College Project Demonstration &bull; Built with HTML, CSS, JavaScript &amp; LocalStorage</span>" +
      '    <button type="button" id="reset-demo-btn" class="reset-demo-btn">Reset Demo Data</button>' +
      "  </div>" +
      "</div>";

    var resetBtn = document.getElementById("reset-demo-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        resetDemoData();
      });
    }
  }

  /* --------------------------------------------------------------------------
     Page Initializers
     -------------------------------------------------------------------------- */
  function initHomePage() {
    var summary = getSummaryStats();
    var elSpaces = document.getElementById("home-stat-spaces");
    var elTotal = document.getElementById("home-stat-total");
    var elAvail = document.getElementById("home-stat-available");
    var elOcc = document.getElementById("home-stat-occupied");

    if (elSpaces) elSpaces.textContent = summary.totalSpaces;
    if (elTotal) elTotal.textContent = summary.totalSeats;
    if (elAvail) elAvail.textContent = summary.availableSeats;
    if (elOcc) elOcc.textContent = summary.occupiedSeats;

    var user = getCurrentUser();
    var ctaContainer = document.getElementById("home-auth-actions");
    if (ctaContainer && user) {
      ctaContainer.innerHTML =
        '<a href="availability.html" class="btn btn-white btn-lg">Find a Seat</a>' +
        '<a href="dashboard.html" class="btn btn-outline-light btn-lg">Go to Dashboard</a>' +
        '<a href="my-bookings.html" class="btn btn-outline-light btn-lg">My Bookings</a>';
    }
  }

  function initLoginPage() {
    var form = document.getElementById("login-form");
    var alertEl = document.getElementById("login-alert");
    var emailInput = document.getElementById("login-email");
    var passwordInput = document.getElementById("login-password");
    var demoBtn = document.getElementById("fill-demo-btn");
    var alreadyBox = document.getElementById("already-logged-in");

    var currentUser = getCurrentUser();
    if (currentUser && alreadyBox) {
      alreadyBox.classList.remove("hidden");
      alreadyBox.innerHTML =
        "You are currently signed in as <strong>" +
        escapeHtml(currentUser.name) +
        "</strong> (" +
        escapeHtml(currentUser.email) +
        '). <a href="dashboard.html">Go to Dashboard</a> or use the form below to switch accounts.';
    }

    var authRequired = getUrlParam("authRequired");
    var registered = getUrlParam("registered");
    var loggedOut = getUrlParam("loggedOut");
    var prefillEmail = getUrlParam("email");
    var nextTarget = getSafeRedirectTarget(getUrlParam("next"));

    if (prefillEmail && emailInput) {
      emailInput.value = prefillEmail;
    }

    if (alertEl) {
      if (authRequired === "1") {
        alertEl.className = "alert alert-warning";
        alertEl.textContent = "Please log in with your student account to access student pages.";
        alertEl.classList.remove("hidden");
      } else if (registered === "1") {
        alertEl.className = "alert alert-success";
        alertEl.textContent = "Account created successfully! Please log in with your email and password.";
        alertEl.classList.remove("hidden");
      } else if (loggedOut === "1") {
        alertEl.className = "alert alert-info";
        alertEl.textContent = "You have been logged out safely.";
        alertEl.classList.remove("hidden");
      }
    }

    if (demoBtn && emailInput && passwordInput) {
      demoBtn.addEventListener("click", function () {
        emailInput.value = DATA.DEMO_USERS[0].email;
        passwordInput.value = DATA.DEMO_USERS[0].password;
      });
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var result = loginUser(emailInput.value, passwordInput.value);
        if (!result.ok) {
          alertEl.className = "alert alert-error";
          alertEl.textContent = result.error;
          alertEl.classList.remove("hidden");
          return;
        }
        global.location.href = nextTarget;
      });
    }
  }

  function initSignupPage() {
    var form = document.getElementById("signup-form");
    var alertEl = document.getElementById("signup-alert");
    var alreadyBox = document.getElementById("signup-already-logged-in");

    var currentUser = getCurrentUser();
    if (currentUser && alreadyBox) {
      alreadyBox.classList.remove("hidden");
      alreadyBox.innerHTML =
        "Currently logged in as <strong>" +
        escapeHtml(currentUser.name) +
        '</strong>. You can still register another student account below or <a href="dashboard.html">return to Dashboard</a>.';
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = document.getElementById("signup-name").value;
        var email = document.getElementById("signup-email").value;
        var password = document.getElementById("signup-password").value;
        var confirmPassword = document.getElementById("signup-confirm").value;

        var result = registerUser(name, email, password, confirmPassword);
        if (!result.ok) {
          alertEl.className = "alert alert-error";
          alertEl.textContent = result.error;
          alertEl.classList.remove("hidden");
          return;
        }

        global.location.href =
          "login.html?registered=1&email=" + encodeURIComponent(result.user.email);
      });
    }
  }

  function initDashboardPage() {
    var user = getCurrentUser();
    if (!user) return;

    var welcomeEl = document.getElementById("dashboard-welcome");
    if (welcomeEl) {
      welcomeEl.textContent = "Welcome back, " + user.name + "!";
    }

    var summary = getSummaryStats();
    document.getElementById("dash-total-spaces").textContent = summary.totalSpaces;
    document.getElementById("dash-total-seats").textContent = summary.totalSeats;
    document.getElementById("dash-available-seats").textContent = summary.availableSeats;
    document.getElementById("dash-occupied-seats").textContent = summary.occupiedSeats;

    // Availability summary table
    var summaryBody = document.getElementById("dash-availability-body");
    if (summaryBody) {
      summaryBody.innerHTML = summary.spaces
        .map(function (item) {
          var s = item.space;
          return (
            "<tr>" +
            "  <td><strong>" + escapeHtml(s.name) + "</strong></td>" +
            "  <td>" + escapeHtml(s.floor) + "</td>" +
            '  <td><span class="badge ' + (s.zone === "Silent Zone" ? "badge-blue" : "badge-green") + '">' + escapeHtml(s.zone) + "</span></td>" +
            "  <td><strong>" + item.availableSeats + "</strong> / " + item.totalSeats + "</td>" +
            '  <td style="min-width:140px;">' +
            '    <div style="display:flex; justify-content:space-between; font-size:0.82rem;">' +
            "      <span>" + item.occupancyPercent + "%</span>" +
            "      <span>" + item.occupiedSeats + " occupied</span>" +
            "    </div>" +
            '    <div class="progress-track"><div class="progress-fill ' + item.progressClass + '" style="width:' + item.occupancyPercent + '%"></div></div>' +
            "  </td>" +
            '  <td><span class="badge ' + item.statusBadgeClass + '">' + item.statusLabel + "</span></td>" +
            '  <td><a class="btn btn-sm btn-primary" href="seat-selection.html?space=' + encodeURIComponent(s.id) + '">Select Seat</a></td>' +
            "</tr>"
          );
        })
        .join("");
    }

    // Recently booked seats
    var bookings = getBookings().slice(0, 6);
    var recentBody = document.getElementById("dash-recent-bookings-body");
    if (recentBody) {
      if (bookings.length === 0) {
        recentBody.innerHTML =
          '<tr><td colspan="6" style="text-align:center; color:#64748b;">No recent bookings recorded yet.</td></tr>';
      } else {
        recentBody.innerHTML = bookings
          .map(function (b) {
            var badge = b.status === "Confirmed" ? "badge-green" : "badge-gray";
            return (
              "<tr>" +
              "  <td>" + escapeHtml(b.studentName) + "</td>" +
              "  <td>" + escapeHtml(b.spaceName) + "</td>" +
              "  <td><strong>" + escapeHtml(b.seatId) + "</strong></td>" +
              "  <td>" + escapeHtml(formatDisplayDate(b.date)) + "</td>" +
              "  <td>" + escapeHtml(b.timeSlot) + "</td>" +
              '  <td><span class="badge ' + badge + '">' + escapeHtml(b.status) + "</span></td>" +
              "</tr>"
            );
          })
          .join("");
      }
    }

    // Study Zone summary cards
    var silentSpaces = summary.spaces.filter(function (x) {
      return x.space.zone === "Silent Zone";
    });
    var collabSpaces = summary.spaces.filter(function (x) {
      return x.space.zone === "Collaborative Zone";
    });

    var silentAvail = silentSpaces.reduce(function (sum, x) { return sum + x.availableSeats; }, 0);
    var collabAvail = collabSpaces.reduce(function (sum, x) { return sum + x.availableSeats; }, 0);

    var silentEl = document.getElementById("dash-silent-summary");
    var collabEl = document.getElementById("dash-collab-summary");
    if (silentEl) {
      silentEl.textContent = silentAvail + " seats currently available across Library Floor 1 & Silent Reading Room.";
    }
    if (collabEl) {
      collabEl.textContent = collabAvail + " seats currently available across Library Floor 2 & Group Discussion Room.";
    }
  }

  function initAvailabilityPage() {
    var cardsContainer = document.getElementById("availability-cards");
    var tableBody = document.getElementById("availability-table-body");
    var filterButtons = document.querySelectorAll("[data-zone-filter]");
    var activeFilter = "all";

    function render() {
      var spaces = getAllSpacesWithStats();
      var filtered = spaces.filter(function (item) {
        if (activeFilter === "all") return true;
        return item.space.zone === activeFilter;
      });

      if (cardsContainer) {
        cardsContainer.innerHTML = filtered
          .map(function (item) {
            var s = item.space;
            var zoneBadge = s.zone === "Silent Zone" ? "badge-blue" : "badge-green";
            var facilitiesHtml = s.facilities
              .map(function (f) {
                return '<span class="tag">' + escapeHtml(f) + "</span>";
              })
              .join("");

            return (
              '<article class="card">' +
              '  <div class="card-header">' +
              "    <div>" +
              '      <h3 class="card-title">' + escapeHtml(s.name) + "</h3>" +
              '      <p class="card-subtitle">' + escapeHtml(s.floor) + " &bull; " + escapeHtml(s.openHours) + "</p>" +
              "    </div>" +
              '    <span class="badge ' + item.statusBadgeClass + '">' + item.statusLabel + "</span>" +
              "  </div>" +
              '  <p style="font-size:0.9rem; color:#475569; margin-bottom:0.6rem;">' + escapeHtml(s.description) + "</p>" +
              '  <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">' +
              '    <span class="badge ' + zoneBadge + '">' + escapeHtml(s.zone) + "</span>" +
              "    <span><strong>" + item.occupancyPercent + "% Occupied</strong></span>" +
              "  </div>" +
              '  <div class="progress-track"><div class="progress-fill ' + item.progressClass + '" style="width:' + item.occupancyPercent + '%"></div></div>' +
              '  <div class="space-metrics">' +
              '    <div class="space-metric-box"><strong>' + item.totalSeats + "</strong><span>Total Seats</span></div>" +
              '    <div class="space-metric-box"><strong style="color:#15803d;">' + item.availableSeats + "</strong><span>Available</span></div>" +
              '    <div class="space-metric-box"><strong style="color:#b91c1c;">' + item.occupiedSeats + "</strong><span>Occupied</span></div>" +
              "  </div>" +
              '  <div class="tag-list">' + facilitiesHtml + "</div>" +
              '  <div style="display:flex; gap:0.55rem; flex-wrap:wrap;">' +
              '    <a class="btn btn-primary" style="flex:1;" href="seat-selection.html?space=' + encodeURIComponent(s.id) + '">Book Now</a>' +
              '    <a class="btn btn-secondary" href="booking.html?space=' + encodeURIComponent(s.id) + '">Booking Form</a>' +
              "  </div>" +
              "</article>"
            );
          })
          .join("");
      }

      if (tableBody) {
        tableBody.innerHTML = filtered
          .map(function (item) {
            var s = item.space;
            return (
              "<tr>" +
              "  <td><strong>" + escapeHtml(s.name) + "</strong></td>" +
              "  <td>" + escapeHtml(s.floor) + "</td>" +
              "  <td>" + escapeHtml(s.zone) + "</td>" +
              "  <td>" + item.totalSeats + "</td>" +
              '  <td><strong style="color:#15803d;">' + item.availableSeats + "</strong></td>" +
              '  <td><strong style="color:#b91c1c;">' + item.occupiedSeats + "</strong></td>" +
              "  <td>" + item.occupancyPercent + "%</td>" +
              '  <td><span class="badge ' + item.statusBadgeClass + '">' + item.statusLabel + "</span></td>" +
              '  <td><a class="btn btn-sm btn-primary" href="seat-selection.html?space=' + encodeURIComponent(s.id) + '">Book Now</a></td>' +
              "</tr>"
            );
          })
          .join("");
      }
    }

    filterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterButtons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        activeFilter = btn.getAttribute("data-zone-filter");
        render();
      });
    });

    render();
  }

  function initSeatSelectionPage() {
    var user = getCurrentUser();
    if (!user) return;

    var spaceSelect = document.getElementById("seat-space-select");
    var dateInput = document.getElementById("seat-date-input");
    var slotSelect = document.getElementById("seat-slot-select");
    var gridEl = document.getElementById("seat-grid");
    var countsEl = document.getElementById("seat-map-counts");
    var alertEl = document.getElementById("seat-alert");
    var emptySelectionEl = document.getElementById("no-seat-selected");
    var detailPanelEl = document.getElementById("selected-seat-details");
    var confirmBtn = document.getElementById("confirm-seat-btn");
    var fullFormLink = document.getElementById("open-full-booking-link");

    var today = DATA.getTodayDateString();
    dateInput.min = today;
    dateInput.value = getUrlParam("date") || today;

    // Populate space dropdown
    spaceSelect.innerHTML = DATA.STUDY_SPACES.map(function (s) {
      return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + " (" + escapeHtml(s.floor) + ")</option>";
    }).join("");

    var requestedSpace = getUrlParam("space");
    if (requestedSpace && getSpaceById(requestedSpace)) {
      spaceSelect.value = requestedSpace;
    }

    // Populate time slot dropdown (default to 09:00 AM - 11:00 AM)
    slotSelect.innerHTML = DATA.TIME_SLOTS.map(function (slot) {
      return '<option value="' + escapeHtml(slot.label) + '">' + escapeHtml(slot.label) + "</option>";
    }).join("");
    slotSelect.value = getUrlParam("slot") || "09:00 AM - 11:00 AM";

    var selectedSeatId = null;

    function updateSelectedPanel(space) {
      if (!selectedSeatId) {
        emptySelectionEl.classList.remove("hidden");
        detailPanelEl.classList.add("hidden");
        return;
      }

      emptySelectionEl.classList.add("hidden");
      detailPanelEl.classList.remove("hidden");

      document.getElementById("sel-seat-id").textContent = selectedSeatId;
      document.getElementById("sel-space-name").textContent = space.name;
      document.getElementById("sel-space-floor").textContent = space.floor;
      document.getElementById("sel-space-zone").textContent = space.zone;
      document.getElementById("sel-date").textContent = formatDisplayDate(dateInput.value);
      document.getElementById("sel-slot").textContent = slotSelect.value;
      document.getElementById("sel-student").textContent = user.name;

      if (fullFormLink) {
        fullFormLink.href =
          "booking.html?space=" +
          encodeURIComponent(space.id) +
          "&seat=" +
          encodeURIComponent(selectedSeatId) +
          "&date=" +
          encodeURIComponent(dateInput.value) +
          "&slot=" +
          encodeURIComponent(slotSelect.value);
      }
    }

    function renderGrid() {
      var space = getSpaceById(spaceSelect.value) || DATA.STUDY_SPACES[0];
      var date = dateInput.value || today;
      var slot = slotSelect.value;

      if (selectedSeatId) {
        var checkCurrent = getSeatStatusForSlot(space, selectedSeatId, date, slot);
        if (space.seats.indexOf(selectedSeatId) === -1 || checkCurrent.occupied) {
          selectedSeatId = null;
        }
      }

      var availCount = 0;
      var occCount = 0;

      gridEl.innerHTML = space.seats
        .map(function (seatId) {
          var status = getSeatStatusForSlot(space, seatId, date, slot);
          var cls = "seat-btn ";
          var titleText = "";

          if (status.occupied) {
            occCount++;
            cls += "seat-btn--occupied";
            titleText = seatId + " - Occupied (" + status.reason + ")";
          } else {
            availCount++;
            cls += selectedSeatId === seatId ? "seat-btn--selected" : "seat-btn--available";
            titleText = seatId + " - Available (Click to select)";
          }

          return (
            '<button type="button" class="' +
            cls +
            '" data-seat-id="' +
            escapeHtml(seatId) +
            '" data-occupied="' +
            (status.occupied ? "1" : "0") +
            '" title="' +
            escapeHtml(titleText) +
            '">' +
            escapeHtml(seatId) +
            "</button>"
          );
        })
        .join("");

      if (countsEl) {
        countsEl.innerHTML =
          "<strong>" +
          escapeHtml(space.name) +
          "</strong> (" +
          escapeHtml(space.floor) +
          ") &mdash; <span style=\"color:#15803d;\"><strong>" +
          availCount +
          " Available</strong></span> &bull; <span style=\"color:#b91c1c;\"><strong>" +
          occCount +
          " Occupied</strong></span> &bull; Total: " +
          space.totalSeats;
      }

      updateSelectedPanel(space);
    }

    gridEl.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-seat-id]");
      if (!btn) return;

      var seatId = btn.getAttribute("data-seat-id");
      var isOccupied = btn.getAttribute("data-occupied") === "1";

      if (isOccupied) {
        var space = getSpaceById(spaceSelect.value);
        var status = getSeatStatusForSlot(space, seatId, dateInput.value, slotSelect.value);
        alertEl.className = "alert alert-error";
        alertEl.textContent = "Seat " + seatId + " cannot be selected: " + status.reason;
        alertEl.classList.remove("hidden");
        return;
      }

      alertEl.classList.add("hidden");
      selectedSeatId = seatId;
      renderGrid();
    });

    spaceSelect.addEventListener("change", function () {
      selectedSeatId = null;
      alertEl.classList.add("hidden");
      renderGrid();
    });

    dateInput.addEventListener("change", function () {
      alertEl.classList.add("hidden");
      renderGrid();
    });

    slotSelect.addEventListener("change", function () {
      alertEl.classList.add("hidden");
      renderGrid();
    });

    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        if (!selectedSeatId) return;
        var result = createBooking({
          spaceId: spaceSelect.value,
          seatId: selectedSeatId,
          date: dateInput.value,
          timeSlot: slotSelect.value
        });

        if (!result.ok) {
          alertEl.className = "alert alert-error";
          alertEl.textContent = result.error;
          alertEl.classList.remove("hidden");
          renderGrid();
          return;
        }

        var b = result.booking;
        alertEl.className = "alert alert-success";
        alertEl.innerHTML =
          "<strong>Booking Confirmed!</strong> Reference <strong>" +
          escapeHtml(b.id) +
          "</strong> &mdash; Seat <strong>" +
          escapeHtml(b.seatId) +
          "</strong> in " +
          escapeHtml(b.spaceName) +
          " on " +
          escapeHtml(formatDisplayDate(b.date)) +
          " (" +
          escapeHtml(b.timeSlot) +
          '). <a href="my-bookings.html">View My Bookings</a>';
        alertEl.classList.remove("hidden");

        selectedSeatId = null;
        renderGrid();
      });
    }

    renderGrid();
  }

  function initZonesPage() {
    var spacesStats = getAllSpacesWithStats();

    function renderZoneSpaces(zoneName, containerId) {
      var el = document.getElementById(containerId);
      if (!el) return;

      var matches = spacesStats.filter(function (item) {
        return item.space.zone === zoneName;
      });

      el.innerHTML = matches
        .map(function (item) {
          var s = item.space;
          return (
            '<div class="card" style="background:#f8fafc; margin-bottom:0.75rem; padding:1rem;">' +
            '  <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">' +
            "    <div>" +
            '      <strong style="color:#0f294a;">' + escapeHtml(s.name) + "</strong>" +
            '      <div style="font-size:0.84rem; color:#475569;">' + escapeHtml(s.floor) + " &bull; " + item.availableSeats + " of " + item.totalSeats + " seats available</div>" +
            "    </div>" +
            '    <div style="display:flex; gap:0.45rem; align-items:center;">' +
            '      <span class="badge ' + item.statusBadgeClass + '">' + item.statusLabel + "</span>" +
            '      <a class="btn btn-sm btn-primary" href="seat-selection.html?space=' + encodeURIComponent(s.id) + '">Select Seat</a>' +
            "    </div>" +
            "  </div>" +
            "</div>"
          );
        })
        .join("");
    }

    renderZoneSpaces("Silent Zone", "silent-zone-spaces");
    renderZoneSpaces("Collaborative Zone", "collab-zone-spaces");
  }

  function initBookingPage() {
    var user = getCurrentUser();
    if (!user) return;

    var form = document.getElementById("booking-form");
    var studentInput = document.getElementById("booking-student");
    var spaceSelect = document.getElementById("booking-space");
    var dateInput = document.getElementById("booking-date");
    var slotSelect = document.getElementById("booking-slot");
    var seatSelect = document.getElementById("booking-seat");
    var alertEl = document.getElementById("booking-alert");
    var confirmationCard = document.getElementById("booking-confirmation-card");
    var summaryPanel = document.getElementById("booking-space-summary");

    var today = DATA.getTodayDateString();
    studentInput.value = user.name + " (" + user.email + ")";
    dateInput.min = today;
    dateInput.value = getUrlParam("date") || today;

    function populateSpaces(selectedSpaceId) {
      var spacesStats = getAllSpacesWithStats();
      spaceSelect.innerHTML = spacesStats
        .map(function (item) {
          var s = item.space;
          return (
            '<option value="' +
            escapeHtml(s.id) +
            '">' +
            escapeHtml(s.name) +
            " (" +
            escapeHtml(s.floor) +
            " - " +
            item.availableSeats +
            " available)</option>"
          );
        })
        .join("");

      if (selectedSpaceId && getSpaceById(selectedSpaceId)) {
        spaceSelect.value = selectedSpaceId;
      }
    }

    slotSelect.innerHTML = DATA.TIME_SLOTS.map(function (slot) {
      return '<option value="' + escapeHtml(slot.label) + '">' + escapeHtml(slot.label) + "</option>";
    }).join("");
    slotSelect.value = getUrlParam("slot") || "09:00 AM - 11:00 AM";

    function populateSeats(preferredSeat) {
      var space = getSpaceById(spaceSelect.value) || DATA.STUDY_SPACES[0];
      var date = dateInput.value || today;
      var slot = slotSelect.value;

      var availableSeats = [];
      var occupiedSeats = [];

      space.seats.forEach(function (seatId) {
        var status = getSeatStatusForSlot(space, seatId, date, slot);
        if (status.occupied) {
          occupiedSeats.push({ seatId: seatId, reason: status.source === "booking" ? "Booked" : "Occupied" });
        } else {
          availableSeats.push(seatId);
        }
      });

      var optionsHtml = '<option value="">-- Select a Seat --</option>';
      if (availableSeats.length > 0) {
        optionsHtml += '<optgroup label="Available Seats (' + availableSeats.length + ')">';
        availableSeats.forEach(function (id) {
          optionsHtml += '<option value="' + escapeHtml(id) + '">' + escapeHtml(id) + " (Available)</option>";
        });
        optionsHtml += "</optgroup>";
      }
      if (occupiedSeats.length > 0) {
        optionsHtml += '<optgroup label="Occupied / Already Booked (' + occupiedSeats.length + ')">';
        occupiedSeats.forEach(function (item) {
          optionsHtml +=
            '<option value="' +
            escapeHtml(item.seatId) +
            '">' +
            escapeHtml(item.seatId) +
            " (" +
            item.reason +
            ")</option>";
        });
        optionsHtml += "</optgroup>";
      }

      seatSelect.innerHTML = optionsHtml;

      if (preferredSeat && space.seats.indexOf(preferredSeat) !== -1) {
        seatSelect.value = preferredSeat;
      } else if (availableSeats.length > 0) {
        seatSelect.value = availableSeats[0];
      }

      if (summaryPanel) {
        var stats = getSpaceStats(space);
        summaryPanel.innerHTML =
          '<h3 class="card-title">' + escapeHtml(space.name) + "</h3>" +
          '<p class="card-subtitle" style="margin-bottom:0.85rem;">' + escapeHtml(space.floor) + " &bull; " + escapeHtml(space.zone) + "</p>" +
          '<ul class="detail-list">' +
          "  <li><span>Total Capacity</span><strong>" + stats.totalSeats + " seats</strong></li>" +
          '  <li><span>Available Now</span><strong style="color:#15803d;">' + stats.availableSeats + " seats</strong></li>" +
          '  <li><span>Occupied Now</span><strong style="color:#b91c1c;">' + stats.occupiedSeats + " seats</strong></li>" +
          "  <li><span>Occupancy Rate</span><strong>" + stats.occupancyPercent + "%</strong></li>" +
          "  <li><span>Open Hours</span><strong>" + escapeHtml(space.openHours) + "</strong></li>" +
          "</ul>" +
          '<a class="btn btn-secondary" style="width:100%;" href="seat-selection.html?space=' + encodeURIComponent(space.id) + '">Open Visual Seat Grid</a>';
      }
    }

    var reqSpace = getUrlParam("space");
    var reqSeat = getUrlParam("seat");
    populateSpaces(reqSpace);
    populateSeats(reqSeat);

    spaceSelect.addEventListener("change", function () {
      alertEl.classList.add("hidden");
      populateSeats(null);
    });
    dateInput.addEventListener("change", function () {
      alertEl.classList.add("hidden");
      populateSeats(seatSelect.value);
    });
    slotSelect.addEventListener("change", function () {
      alertEl.classList.add("hidden");
      populateSeats(seatSelect.value);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var chosenSpace = spaceSelect.value;
      var chosenSeat = seatSelect.value;

      var result = createBooking({
        spaceId: chosenSpace,
        seatId: chosenSeat,
        date: dateInput.value,
        timeSlot: slotSelect.value
      });

      if (!result.ok) {
        alertEl.className = "alert alert-error";
        alertEl.textContent = result.error;
        alertEl.classList.remove("hidden");
        confirmationCard.classList.add("hidden");
        return;
      }

      var b = result.booking;
      alertEl.className = "alert alert-success";
      alertEl.textContent = "Seat " + b.seatId + " has been confirmed and your seat availability has been updated.";
      alertEl.classList.remove("hidden");

      confirmationCard.classList.remove("hidden");
      confirmationCard.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">' +
        '  <h3 class="card-title" style="color:#15803d;">Booking Confirmed</h3>' +
        '  <span class="badge badge-green">' + escapeHtml(b.status) + "</span>" +
        "</div>" +
        '<ul class="detail-list">' +
        "  <li><span>Booking Reference</span><strong>" + escapeHtml(b.id) + "</strong></li>" +
        "  <li><span>Student Name</span><strong>" + escapeHtml(b.studentName) + "</strong></li>" +
        "  <li><span>Study Space</span><strong>" + escapeHtml(b.spaceName) + "</strong></li>" +
        "  <li><span>Floor</span><strong>" + escapeHtml(b.floor) + "</strong></li>" +
        "  <li><span>Seat Number</span><strong>" + escapeHtml(b.seatId) + "</strong></li>" +
        "  <li><span>Date</span><strong>" + escapeHtml(formatDisplayDate(b.date)) + "</strong></li>" +
        "  <li><span>Time Slot</span><strong>" + escapeHtml(b.timeSlot) + "</strong></li>" +
        "</ul>" +
        '<div style="display:flex; gap:0.65rem; flex-wrap:wrap;">' +
        '  <a href="my-bookings.html" class="btn btn-primary">View My Bookings</a>' +
        '  <a href="dashboard.html" class="btn btn-secondary">Return to Dashboard</a>' +
        "</div>";

      populateSpaces(chosenSpace);
      populateSeats(null);
    });
  }

  function initMyBookingsPage() {
    var user = getCurrentUser();
    if (!user) return;

    var alertEl = document.getElementById("my-bookings-alert");
    var containerEl = document.getElementById("my-bookings-container");
    var subtitleEl = document.getElementById("my-bookings-subtitle");

    if (subtitleEl) {
      subtitleEl.textContent = "Showing seat reservations for " + user.name + " (" + user.email + ")";
    }

    function render() {
      var allBookings = getBookings();
      var myBookings = allBookings.filter(function (b) {
        return b.studentEmail.toLowerCase() === user.email.toLowerCase();
      });

      if (myBookings.length === 0) {
        containerEl.innerHTML =
          '<div class="empty-state">' +
          '  <div class="empty-state-icon">' +
          '    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
          '      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>' +
          '      <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line>' +
          '      <line x1="3" y1="10" x2="21" y2="10"></line>' +
          "    </svg>" +
          "  </div>" +
          "  <h3>No Bookings Found</h3>" +
          '  <p style="color:#475569; max-width:440px; margin:0 auto 1.25rem;">You do not have any study seat bookings yet. Browse available spaces and reserve a seat in seconds.</p>' +
          '  <div style="display:flex; justify-content:center; gap:0.75rem; flex-wrap:wrap;">' +
          '    <a href="availability.html" class="btn btn-primary">Find a Seat</a>' +
          '    <a href="booking.html" class="btn btn-secondary">New Booking</a>' +
          "  </div>" +
          "</div>";
        return;
      }

      var rowsHtml = myBookings
        .map(function (b) {
          var isConfirmed = b.status === "Confirmed";
          var statusBadge = isConfirmed
            ? '<span class="badge badge-green">Confirmed</span>'
            : '<span class="badge badge-red">Cancelled</span>';
          var actionBtn = isConfirmed
            ? '<button type="button" class="btn btn-sm btn-danger" data-cancel-id="' + escapeHtml(b.id) + '">Cancel Booking</button>'
            : '<button type="button" class="btn btn-sm btn-subtle" data-remove-id="' + escapeHtml(b.id) + '">Remove</button>';

          return (
            "<tr>" +
            "  <td><strong>" + escapeHtml(b.id) + "</strong></td>" +
            "  <td>" + escapeHtml(b.studentName) + "</td>" +
            "  <td>" + escapeHtml(b.spaceName) + "</td>" +
            "  <td>" + escapeHtml(b.floor) + "</td>" +
            "  <td><strong>" + escapeHtml(b.seatId) + "</strong></td>" +
            "  <td>" + escapeHtml(formatDisplayDate(b.date)) + "</td>" +
            "  <td>" + escapeHtml(b.timeSlot) + "</td>" +
            "  <td>" + statusBadge + "</td>" +
            "  <td>" + actionBtn + "</td>" +
            "</tr>"
          );
        })
        .join("");

      containerEl.innerHTML =
        '<div class="card">' +
        '  <div class="table-responsive">' +
        '    <table class="data-table">' +
        "      <thead>" +
        "        <tr>" +
        "          <th>Ref ID</th>" +
        "          <th>Student Name</th>" +
        "          <th>Study Space</th>" +
        "          <th>Floor</th>" +
        "          <th>Seat No.</th>" +
        "          <th>Date</th>" +
        "          <th>Time Slot</th>" +
        "          <th>Status</th>" +
        "          <th>Action</th>" +
        "        </tr>" +
        "      </thead>" +
        "      <tbody>" + rowsHtml + "</tbody>" +
        "    </table>" +
        "  </div>" +
        "</div>";
    }

    containerEl.addEventListener("click", function (e) {
      var cancelBtn = e.target.closest("[data-cancel-id]");
      if (cancelBtn) {
        var cancelId = cancelBtn.getAttribute("data-cancel-id");
        if (cancelBookingById(cancelId)) {
          alertEl.className = "alert alert-success";
          alertEl.textContent =
            "Booking " + cancelId + " has been cancelled. The seat is now available again across all study spaces.";
          alertEl.classList.remove("hidden");
          render();
        }
        return;
      }

      var removeBtn = e.target.closest("[data-remove-id]");
      if (removeBtn) {
        var removeId = removeBtn.getAttribute("data-remove-id");
        if (removeCancelledBookingById(removeId)) {
          render();
        }
      }
    });

    render();
  }

  function initFeedbackPage() {
    var form = document.getElementById("feedback-form");
    var alertEl = document.getElementById("feedback-alert");
    var listEl = document.getElementById("feedback-list");
    var nameInput = document.getElementById("fb-name");
    var emailInput = document.getElementById("fb-email");
    var spaceSelect = document.getElementById("fb-space");
    var ratingSelect = document.getElementById("fb-rating");
    var messageInput = document.getElementById("fb-message");

    var currentUser = getCurrentUser();
    if (currentUser) {
      if (nameInput && !nameInput.value) nameInput.value = currentUser.name;
      if (emailInput && !emailInput.value) emailInput.value = currentUser.email;
    }

    if (spaceSelect) {
      spaceSelect.innerHTML =
        DATA.STUDY_SPACES.map(function (s) {
          return '<option value="' + escapeHtml(s.name) + '">' + escapeHtml(s.name) + "</option>";
        }).join("") + '<option value="Overall Platform">Overall Platform</option>';
    }

    function renderStars(rating) {
      var stars = "";
      var num = parseInt(rating, 10) || 5;
      for (var i = 1; i <= 5; i++) {
        stars += i <= num ? "&#9733;" : "&#9734;";
      }
      return '<span class="star-rating" aria-label="' + num + ' out of 5 stars">' + stars + " (" + num + "/5)</span>";
    }

    function renderFeedbackList() {
      var entries = readStorage(STORAGE_KEYS.FEEDBACK, cloneArray(DATA.DEFAULT_FEEDBACK));
      if (!listEl) return;

      listEl.innerHTML = entries
        .map(function (entry) {
          var sourceBadge = entry.isSample
            ? '<span class="badge badge-gray">Illustrative Example</span>'
            : '<span class="badge badge-blue">Submitted Feedback</span>';
          return (
            '<article class="card" style="margin-bottom:1rem;">' +
            '  <div class="card-header">' +
            "    <div>" +
            '      <h3 class="card-title">' + escapeHtml(entry.studentName) + "</h3>" +
            '      <p class="card-subtitle">' + escapeHtml(entry.spaceName) + " &bull; " + escapeHtml(formatDisplayDate(entry.date)) + "</p>" +
            "    </div>" +
            '    <div style="text-align:right;">' +
            "      <div>" + renderStars(entry.rating) + "</div>" +
            '      <div style="margin-top:0.25rem;">' + sourceBadge + "</div>" +
            "    </div>" +
            "  </div>" +
            '  <p style="margin-bottom:0; color:#334155;">' + escapeHtml(entry.message) + "</p>" +
            "</article>"
          );
        })
        .join("");
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var sName = nameInput.value.trim();
        var sEmail = emailInput.value.trim();
        var sSpace = spaceSelect.value;
        var sRating = parseInt(ratingSelect.value, 10);
        var sMsg = messageInput.value.trim();

        if (!sName || !sEmail || !sMsg || isNaN(sRating) || sRating < 1 || sRating > 5) {
          alertEl.className = "alert alert-error";
          alertEl.textContent = "Please complete all feedback fields and select a rating between 1 and 5.";
          alertEl.classList.remove("hidden");
          return;
        }

        var entries = readStorage(STORAGE_KEYS.FEEDBACK, cloneArray(DATA.DEFAULT_FEEDBACK));
        entries.unshift({
          id: "FB-" + Date.now(),
          studentName: sName,
          email: sEmail,
          spaceName: sSpace,
          rating: sRating,
          message: sMsg,
          date: DATA.getTodayDateString(),
          isSample: false
        });
        writeStorage(STORAGE_KEYS.FEEDBACK, entries);

        alertEl.className = "alert alert-success";
        alertEl.textContent = "Thank you! Your feedback for " + sSpace + " has been submitted.";
        alertEl.classList.remove("hidden");

        messageInput.value = "";
        ratingSelect.value = "5";
        renderFeedbackList();
      });
    }

    renderFeedbackList();
  }

  function initContactPage() {
    var form = document.getElementById("contact-form");
    var alertEl = document.getElementById("contact-alert");
    var nameInput = document.getElementById("contact-name");
    var emailInput = document.getElementById("contact-email");
    var msgInput = document.getElementById("contact-message");

    var currentUser = getCurrentUser();
    if (currentUser) {
      if (nameInput && !nameInput.value) nameInput.value = currentUser.name;
      if (emailInput && !emailInput.value) emailInput.value = currentUser.email;
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = nameInput.value.trim();
        var email = emailInput.value.trim();
        var message = msgInput.value.trim();

        if (!name || !email || !message) {
          alertEl.className = "alert alert-error";
          alertEl.textContent = "Please fill in your name, email address, and message.";
          alertEl.classList.remove("hidden");
          return;
        }

        var messages = readStorage(STORAGE_KEYS.CONTACTS, []);
        messages.unshift({
          id: "MSG-" + Date.now(),
          name: name,
          email: email,
          message: message,
          date: DATA.getTodayDateString()
        });
        writeStorage(STORAGE_KEYS.CONTACTS, messages);

        alertEl.className = "alert alert-success";
        alertEl.innerHTML =
          "<strong>Message Sent!</strong> Thank you, " +
          escapeHtml(name) +
          ". Your inquiry has been recorded for the College Library Helpdesk.";
        alertEl.classList.remove("hidden");

        msgInput.value = "";
      });
    }
  }

  /* --------------------------------------------------------------------------
     Bootstrap on Load
     -------------------------------------------------------------------------- */
  ensureInitialData();
  var isAllowed = enforceAuthOnProtectedPage();

  if (isAllowed) {
    document.addEventListener("DOMContentLoaded", function () {
      renderHeader();
      renderFooter();

      var page = document.body.getAttribute("data-page");
      switch (page) {
        case "home":
          initHomePage();
          break;
        case "login":
          initLoginPage();
          break;
        case "signup":
          initSignupPage();
          break;
        case "dashboard":
          initDashboardPage();
          break;
        case "availability":
          initAvailabilityPage();
          break;
        case "seat-selection":
          initSeatSelectionPage();
          break;
        case "zones":
          initZonesPage();
          break;
        case "booking":
          initBookingPage();
          break;
        case "my-bookings":
          initMyBookingsPage();
          break;
        case "feedback":
          initFeedbackPage();
          break;
        case "contact":
          initContactPage();
          break;
        default:
          break;
      }
    });
  }
})(window);
