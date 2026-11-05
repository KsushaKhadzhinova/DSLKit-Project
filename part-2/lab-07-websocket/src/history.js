// Message history, one capped list per room. The socket handlers only use `add` and `list` and
// wait for both with `await`, so any store with these two methods can be plugged in: the in-memory
// one below, or the MongoDB one. The number of rooms is capped in memory, otherwise a client
// inventing room names could grow the memory without limit.
const createHistory = (limit = 50, maxRooms = 200) => {
  const rooms = new Map();
  return {
    add(room, message) {
      const list = rooms.get(room) ?? [];
      list.push(message);
      if (list.length > limit) list.shift();
      rooms.delete(room); // re-insert so the most recently used room is the last one
      rooms.set(room, list);
      if (rooms.size > maxRooms) rooms.delete(rooms.keys().next().value);
    },
    list(room) {
      return [...(rooms.get(room) ?? [])];
    },
  };
};

// History in a MongoDB collection (the object returned by `db.collection('messages')` of the
// official driver). Only insertOne and find(...).sort(...).limit(...).toArray() are used, so tests
// can pass a small fake collection and need no database.
const createMongoHistory = (collection, limit = 50) => ({
  async add(room, message) {
    await collection.insertOne({ ...message, room });
  },
  async list(room) {
    const newest = await collection.find({ room }).sort({ _id: -1 }).limit(limit).toArray();
    // Newest first in the query, oldest first for the client; the database id stays inside.
    return newest.reverse().map(({ _id, ...message }) => message);
  },
});

module.exports = { createHistory, createMongoHistory };
