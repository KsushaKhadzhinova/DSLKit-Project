// "2026-10-16 12:30:05" in local time, the same look in every locale.
export const formatTime = (iso) => new Date(iso).toLocaleString('sv-SE');
