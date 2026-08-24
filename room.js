// rooms.js
const { randomUUID } = require("crypto");

/**
 * Helper to compute an ISO datetime relative to today.
 */
const getRelativeDateTime = (daysOffset = 0, hours = 9, minutes = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
};

/**
 * Dummy in-memory database with 5 rooms, each with 3 bookings.
 * Dates are relative to new Date(). All IDs use UUID strings.
 */
const rooms = [
    {
        id: randomUUID(),
        room_type: "Grand Conference Hall",
        open_time: "08:00",
        close_time: "20:00",
        rate_per_hour: 120,
        reservations: [
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(1, 9, 0),
                end_datetime: getRelativeDateTime(1, 11, 0)
            },
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(1, 14, 0),
                end_datetime: getRelativeDateTime(1, 16, 30)
            },
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(2, 10, 0),
                end_datetime: getRelativeDateTime(2, 12, 0)
            }
        ]
    },
    {
        id: randomUUID(),
        room_type: "Executive Boardroom",
        open_time: "08:30",
        close_time: "19:00",
        rate_per_hour: 85,
        reservations: [
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(1, 10, 0),
                end_datetime: getRelativeDateTime(1, 12, 0)
            },
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(2, 13, 0),
                end_datetime: getRelativeDateTime(2, 15, 0)
            },
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(3, 9, 30),
                end_datetime: getRelativeDateTime(3, 11, 30)
            }
        ]
    },
    {
        id: randomUUID(),
        room_type: "Innovation Workshop Studio",
        open_time: "09:00",
        close_time: "21:00",
        rate_per_hour: 70,
        reservations: [
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(1, 13, 0),
                end_datetime: getRelativeDateTime(1, 15, 0)
            },
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(2, 15, 0),
                end_datetime: getRelativeDateTime(2, 18, 0)
            },
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(3, 10, 0),
                end_datetime: getRelativeDateTime(3, 12, 0)
            }
        ]
    },
    {
        id: randomUUID(),
        room_type: "Creative Brainstorming Suite",
        open_time: "08:00",
        close_time: "18:00",
        rate_per_hour: 55,
        reservations: [
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(1, 11, 0),
                end_datetime: getRelativeDateTime(1, 13, 0)
            },
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(2, 9, 0),
                end_datetime: getRelativeDateTime(2, 11, 0)
            },
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(4, 14, 0),
                end_datetime: getRelativeDateTime(4, 16, 0)
            }
        ]
    },
    {
        id: randomUUID(),
        room_type: "Private Focus Pod",
        open_time: "07:00",
        close_time: "22:00",
        rate_per_hour: 25,
        reservations: [
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(1, 8, 0),
                end_datetime: getRelativeDateTime(1, 10, 0)
            },
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(1, 16, 0),
                end_datetime: getRelativeDateTime(1, 18, 0)
            },
            {
                id: randomUUID(),
                start_datetime: getRelativeDateTime(2, 11, 0),
                end_datetime: getRelativeDateTime(2, 13, 0)
            }
        ]
    }
];

/**
 * Checks if a room is available for the given timeframe (no overlap and within operating hours).
 * Returns boolean: true if available, false otherwise.
 */
const checkIsRoomAvailable = (roomId, start_datetime, end_datetime) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return false;

    const start = new Date(start_datetime).getTime();
    const end = new Date(end_datetime).getTime();

    if (isNaN(start) || isNaN(end) || start >= end) return false;

    // Check operating hours
    if (room.open_time && room.close_time) {
        const [openH, openM] = room.open_time.split(":").map(Number);
        const [closeH, closeM] = room.close_time.split(":").map(Number);
        const openMins = openH * 60 + (openM || 0);
        const closeMins = closeH * 60 + (closeM || 0);

        const startDate = new Date(start_datetime);
        const endDate = new Date(end_datetime);
        const startMins = startDate.getHours() * 60 + startDate.getMinutes();
        const endMins = endDate.getHours() * 60 + endDate.getMinutes();

        if (startMins < openMins || (endMins > closeMins && endMins !== 0)) {
            return false;
        }
    }

    // Check overlap with existing reservations
    return !room.reservations.some(res => {
        const resStart = new Date(res.start_datetime).getTime();
        const resEnd = new Date(res.end_datetime).getTime();
        return start < resEnd && end > resStart;
    });
};

/**
 * Shows all reservations across all rooms, or for a specific room if roomId string is provided.
 */
const showAllReservations = (roomId) => {
    if (roomId) {
        const room = rooms.find(r => r.id === roomId);
        return room ? room.reservations : [];
    }

    return rooms.flatMap(room =>
        room.reservations.map(res => ({
            ...res,
            roomId: room.id,
            room_type: room.room_type
        }))
    );
};

/**
 * Finds a reservation by its UUID string.
 */
const findReservation = (reservationId) => {
    for (const room of rooms) {
        const reservation = room.reservations.find(r => r.id === reservationId);
        if (reservation) {
            return {
                ...reservation,
                roomId: room.id,
                room_type: room.room_type
            };
        }
    }
    return null;
};

/**
 * Adds a new reservation to a room after verifying availability and non-overlapping times.
 */
const addReservation = (roomId, start_datetime, end_datetime) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
        return { error: `Room ${roomId} not found.` };
    }

    if (!checkIsRoomAvailable(roomId, start_datetime, end_datetime)) {
        return { error: "Room is not available for the requested time." };
    }

    const newReservation = {
        id: randomUUID(),
        start_datetime: new Date(start_datetime).toISOString(),
        end_datetime: new Date(end_datetime).toISOString()
    };

    room.reservations.push(newReservation);
    return newReservation;
};

/**
 * Updates an existing reservation's start and end times after validating non-overlapping times.
 */
const updateReservation = (reservationId, start_datetime, end_datetime) => {
    let targetRoom = null;
    let reservation = null;

    for (const room of rooms) {
        const res = room.reservations.find(r => r.id === reservationId);
        if (res) {
            targetRoom = room;
            reservation = res;
            break;
        }
    }

    if (!reservation) {
        return { error: `Reservation ${reservationId} not found.` };
    }

    const start = new Date(start_datetime).getTime();
    const end = new Date(end_datetime).getTime();

    if (isNaN(start) || isNaN(end) || start >= end) {
        return { error: "Invalid start_datetime or end_datetime." };
    }

    // Check operating hours
    if (targetRoom.open_time && targetRoom.close_time) {
        const [openH, openM] = targetRoom.open_time.split(":").map(Number);
        const [closeH, closeM] = targetRoom.close_time.split(":").map(Number);
        const openMins = openH * 60 + (openM || 0);
        const closeMins = closeH * 60 + (closeM || 0);

        const startDate = new Date(start_datetime);
        const endDate = new Date(end_datetime);
        const startMins = startDate.getHours() * 60 + startDate.getMinutes();
        const endMins = endDate.getHours() * 60 + endDate.getMinutes();

        if (startMins < openMins || (endMins > closeMins && endMins !== 0)) {
            return { error: `Time is outside operating hours (${targetRoom.open_time} - ${targetRoom.close_time}).` };
        }
    }

    // Check overlap with other reservations in the room (excluding this reservation)
    const hasOverlap = targetRoom.reservations.some(res => {
        if (res.id === reservationId) return false;
        const resStart = new Date(res.start_datetime).getTime();
        const resEnd = new Date(res.end_datetime).getTime();
        return start < resEnd && end > resStart;
    });

    if (hasOverlap) {
        return { error: "Updated time conflicts with an existing reservation." };
    }

    reservation.start_datetime = new Date(start_datetime).toISOString();
    reservation.end_datetime = new Date(end_datetime).toISOString();

    return reservation;
};

/**
 * Deletes a reservation by its UUID string.
 */
const deleteReservation = (reservationId) => {
    for (const room of rooms) {
        const idx = room.reservations.findIndex(r => r.id === reservationId);
        if (idx !== -1) {
            const [deleted] = room.reservations.splice(idx, 1);
            return deleted;
        }
    }
    return { error: `Reservation ${reservationId} not found.` };
};

module.exports = {
    rooms,
    getRelativeDateTime,
    checkIsRoomAvailable,
    showAllReservations,
    findReservation,
    addReservation,
    updateReservation,
    deleteReservation
};