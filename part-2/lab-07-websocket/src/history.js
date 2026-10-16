// In-memory message history, one capped list per room. A database (lab 6) can replace it
// later: the socket handlers only use `add` and `list`.
const createHistory = (limit = 50) => {
  const rooms = new Map();
  return {
    add(room, message) {
      const list = rooms.get(room) ?? [];
      list.push(message);
      if (list.length > limit) list.shift();
      rooms.set(room, list);
    },
    list(room) {
      return [...(rooms.get(room) ?? [])];
    },
  };
};

module.exports = { createHistory };
