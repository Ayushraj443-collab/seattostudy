/* ============================================================================
   A Seat to Study - Sample Dataset & Configuration (data.js)
   ----------------------------------------------------------------------------
   IMPORTANT: All study-space counts, demo student accounts, sample bookings,
   and example feedback entries in this file are ILLUSTRATIVE SAMPLE DATA for
   college project demonstration purposes (stored locally in the browser).
   You can edit the numbers or names below to customize the demonstration.
   ============================================================================ */

(function (global) {
  "use strict";

  /**
   * Returns today's local date in YYYY-MM-DD format so sample bookings
   * always match the current demonstration date.
   */
  function getTodayDateString() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  /**
   * Formats a seat ID given a prefix, index number, and zero-pad width.
   * Examples: ("G", 1, 2) -> "G01", ("F", 101, 2) -> "F101"
   */
  function formatSeatId(prefix, number, padWidth) {
    var numStr = String(number);
    while (numStr.length < padWidth) {
      numStr = "0" + numStr;
    }
    return prefix + numStr;
  }

  /**
   * Generates all sequential seat IDs for a study space.
   */
  function generateSeatIds(space) {
    var seats = [];
    for (var i = 0; i < space.totalSeats; i++) {
      var seatNumber = space.seatStart + i;
      seats.push(formatSeatId(space.seatPrefix, seatNumber, space.seatPad));
    }
    return seats;
  }

  /**
   * Available booking time slots (includes overlapping mid-slots so
   * duplicate/overlapping seat booking prevention can be demonstrated easily).
   */
  var TIME_SLOTS = [
    { id: "08:00-10:00", label: "08:00 AM - 10:00 AM", startMin: 480, endMin: 600 },
    { id: "09:00-11:00", label: "09:00 AM - 11:00 AM", startMin: 540, endMin: 660 },
    { id: "10:00-12:00", label: "10:00 AM - 12:00 PM", startMin: 600, endMin: 720 },
    { id: "12:00-14:00", label: "12:00 PM - 02:00 PM", startMin: 720, endMin: 840 },
    { id: "14:00-16:00", label: "02:00 PM - 04:00 PM", startMin: 840, endMin: 960 },
    { id: "15:00-17:00", label: "03:00 PM - 05:00 PM", startMin: 900, endMin: 1020 },
    { id: "16:00-18:00", label: "04:00 PM - 06:00 PM", startMin: 960, endMin: 1080 },
    { id: "18:00-20:00", label: "06:00 PM - 08:00 PM", startMin: 1080, endMin: 1200 }
  ];

  /**
   * Four core study spaces with the exact sample capacity & initial occupancy:
   * - Library Floor 1:       100 total | 25 available | 75 occupied
   * - Library Floor 2:        80 total | 40 available | 40 occupied
   * - Silent Reading Room:    50 total | 12 available | 38 occupied
   * - Group Discussion Room:  30 total | 15 available | 15 occupied
   * Total: 4 spaces | 260 total seats | 92 available | 168 occupied
   */
  var STUDY_SPACES_CONFIG = [
    {
      id: "library-floor-1",
      name: "Library Floor 1",
      floor: "Ground Floor",
      zone: "Silent Zone",
      seatPrefix: "G",
      seatStart: 1,
      seatPad: 2,
      totalSeats: 100,
      targetInitialOccupied: 75,
      openHours: "08:00 AM - 08:00 PM",
      facilities: ["Power Outlets", "High-Speed Wi-Fi", "Individual Desks", "Quiet Lighting"],
      description:
        "Main ground-floor individual study hall ideal for focused reading, daily coursework, and quiet solo preparation."
    },
    {
      id: "library-floor-2",
      name: "Library Floor 2",
      floor: "First Floor",
      zone: "Collaborative Zone",
      seatPrefix: "F",
      seatStart: 101,
      seatPad: 2,
      totalSeats: 80,
      targetInitialOccupied: 40,
      openHours: "08:00 AM - 08:00 PM",
      facilities: ["Shared Study Tables", "Power Strips", "Wi-Fi", "Project Discussion Desks"],
      description:
        "First-floor open collaborative wing designed for peer learning, paired study, and team academic assignments."
    },
    {
      id: "silent-reading-room",
      name: "Silent Reading Room",
      floor: "Second Floor",
      zone: "Silent Zone",
      seatPrefix: "R",
      seatStart: 1,
      seatPad: 2,
      totalSeats: 50,
      targetInitialOccupied: 38,
      openHours: "08:00 AM - 08:00 PM",
      facilities: ["Strict Silence Policy", "Reading Lamps", "Ergonomic Chairs", "No Phone Calls"],
      description:
        "Dedicated second-floor quiet room tailored for competitive exam preparation, thesis writing, and deep concentration."
    },
    {
      id: "group-discussion-room",
      name: "Group Discussion Room",
      floor: "Second Floor",
      zone: "Collaborative Zone",
      seatPrefix: "D",
      seatStart: 1,
      seatPad: 2,
      totalSeats: 30,
      targetInitialOccupied: 15,
      openHours: "09:00 AM - 07:00 PM",
      facilities: ["Whiteboards", "Round Team Tables", "Presentation Screen", "Group Seating"],
      description:
        "Second-floor discussion space equipped for group brainstorming, project rehearsals, and collaborative workshops."
    }
  ];

  /**
   * Demo student accounts stored in LocalStorage on first load.
   */
  var DEMO_USERS = [
    {
      id: "stu-101",
      name: "Aarav Sharma",
      email: "aarav.sharma@college.edu",
      password: "student123",
      role: "Student",
      createdAt: "2026-10-15"
    },
    {
      id: "stu-102",
      name: "Priya Patel",
      email: "priya.patel@college.edu",
      password: "student123",
      role: "Student",
      createdAt: "2026-10-18"
    }
  ];

  var today = getTodayDateString();

  /**
   * Illustrative example bookings shown on initial load.
   * Note how each space's initial booked seats are subtracted from
   * targetInitialOccupied to compute baseOccupiedSeats so total occupancy
   * matches the exact dataset numbers (75, 40, 38, 15).
   */
  var DEFAULT_BOOKINGS = [
    {
      id: "BK-1001",
      studentName: "Aarav Sharma",
      studentEmail: "aarav.sharma@college.edu",
      spaceId: "library-floor-1",
      spaceName: "Library Floor 1",
      floor: "Ground Floor",
      seatId: "G14",
      date: today,
      timeSlot: "09:00 AM - 11:00 AM",
      status: "Confirmed",
      isSample: true,
      createdAt: today + " 08:15"
    },
    {
      id: "BK-1002",
      studentName: "Priya Patel",
      studentEmail: "priya.patel@college.edu",
      spaceId: "library-floor-1",
      spaceName: "Library Floor 1",
      floor: "Ground Floor",
      seatId: "G25",
      date: today,
      timeSlot: "09:00 AM - 11:00 AM",
      status: "Confirmed",
      isSample: true,
      createdAt: today + " 08:20"
    },
    {
      id: "BK-1003",
      studentName: "Priya Patel",
      studentEmail: "priya.patel@college.edu",
      spaceId: "library-floor-2",
      spaceName: "Library Floor 2",
      floor: "First Floor",
      seatId: "F108",
      date: today,
      timeSlot: "09:00 AM - 11:00 AM",
      status: "Confirmed",
      isSample: true,
      createdAt: today + " 08:28"
    },
    {
      id: "BK-1004",
      studentName: "Aarav Sharma",
      studentEmail: "aarav.sharma@college.edu",
      spaceId: "silent-reading-room",
      spaceName: "Silent Reading Room",
      floor: "Second Floor",
      seatId: "R08",
      date: today,
      timeSlot: "09:00 AM - 11:00 AM",
      status: "Confirmed",
      isSample: true,
      createdAt: today + " 08:35"
    },
    {
      id: "BK-1005",
      studentName: "Rohan Verma",
      studentEmail: "rohan.verma@college.edu",
      spaceId: "group-discussion-room",
      spaceName: "Group Discussion Room",
      floor: "Second Floor",
      seatId: "D05",
      date: today,
      timeSlot: "09:00 AM - 11:00 AM",
      status: "Confirmed",
      isSample: true,
      createdAt: today + " 08:42"
    }
  ];

  /**
   * Build complete space objects with generated seat lists and deterministic
   * baseline occupied seats so initial counts are 100% mathematically consistent.
   */
  var STUDY_SPACES = STUDY_SPACES_CONFIG.map(function (space) {
    var allSeats = generateSeatIds(space);

    // Find which seats in this space are already covered by DEFAULT_BOOKINGS
    var bookedSeatSet = {};
    DEFAULT_BOOKINGS.forEach(function (booking) {
      if (booking.spaceId === space.id && booking.status === "Confirmed") {
        bookedSeatSet[booking.seatId] = true;
      }
    });

    var initialBookedCount = Object.keys(bookedSeatSet).length;
    var baseOccupiedNeeded = Math.max(0, space.targetInitialOccupied - initialBookedCount);

    // Deterministically pick baseline occupied seats (skipping seats used in DEFAULT_BOOKINGS
    // and leaving a nice spread of green available seats near the start for easy demos).
    var baseOccupiedSeats = [];
    // First pass: pick seats using a deterministic pattern starting from index 3
    for (var idx = 0; idx < allSeats.length && baseOccupiedSeats.length < baseOccupiedNeeded; idx++) {
      var candidateIndex = (idx * 7 + 3) % allSeats.length;
      var seatId = allSeats[candidateIndex];
      if (!bookedSeatSet[seatId] && baseOccupiedSeats.indexOf(seatId) === -1) {
        baseOccupiedSeats.push(seatId);
      }
    }
    // Safety fallback pass if needed
    for (var j = 0; j < allSeats.length && baseOccupiedSeats.length < baseOccupiedNeeded; j++) {
      var fallbackId = allSeats[j];
      if (!bookedSeatSet[fallbackId] && baseOccupiedSeats.indexOf(fallbackId) === -1) {
        baseOccupiedSeats.push(fallbackId);
      }
    }

    return {
      id: space.id,
      name: space.name,
      floor: space.floor,
      zone: space.zone,
      seatPrefix: space.seatPrefix,
      seatStart: space.seatStart,
      seatPad: space.seatPad,
      totalSeats: space.totalSeats,
      openHours: space.openHours,
      facilities: space.facilities,
      description: space.description,
      seats: allSeats,
      baseOccupiedSeats: baseOccupiedSeats
    };
  });

  /**
   * Illustrative example feedback entries so the feedback section is complete
   * out of the box (clearly labeled as illustrative sample data).
   */
  var DEFAULT_FEEDBACK = [
    {
      id: "FB-201",
      studentName: "Neha Kulkarni",
      email: "neha.kulkarni@college.edu",
      spaceName: "Silent Reading Room",
      rating: 5,
      message:
        "Very peaceful environment for semester exam preparation. Checking seat availability before walking up to the second floor saved a lot of time.",
      date: "2026-11-08",
      isSample: true
    },
    {
      id: "FB-202",
      studentName: "Vikram Nair",
      email: "vikram.nair@college.edu",
      spaceName: "Group Discussion Room",
      rating: 4,
      message:
        "Great collaborative tables and whiteboards for our capstone project discussions. Having a clear separation from silent zones keeps everyone comfortable.",
      date: "2026-11-09",
      isSample: true
    },
    {
      id: "FB-203",
      studentName: "Ananya Iyer",
      email: "ananya.iyer@college.edu",
      spaceName: "Library Floor 1",
      rating: 4,
      message:
        "Easy seat booking and reliable power outlets on the ground floor. Floor 1 fills up quickly around 10 AM, so booking ahead helps.",
      date: "2026-11-10",
      isSample: true
    },
    {
      id: "FB-204",
      studentName: "Siddharth Mehta",
      email: "siddharth.mehta@college.edu",
      spaceName: "Library Floor 2",
      rating: 5,
      message:
        "Good balance of open seating and shared desks for pair programming and assignment reviews with classmates.",
      date: "2026-11-10",
      isSample: true
    }
  ];

  // Expose dataset globally for script.js
  global.SEAT_STUDY_DATA = {
    getTodayDateString: getTodayDateString,
    TIME_SLOTS: TIME_SLOTS,
    STUDY_SPACES: STUDY_SPACES,
    DEMO_USERS: DEMO_USERS,
    DEFAULT_BOOKINGS: DEFAULT_BOOKINGS,
    DEFAULT_FEEDBACK: DEFAULT_FEEDBACK
  };
})(window);

