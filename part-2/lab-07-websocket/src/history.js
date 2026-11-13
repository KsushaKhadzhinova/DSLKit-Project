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
// official driver). Only insertOne, createIndex and find(...).sort(...).limit(...).toArray() are used,
// so tests can pass a small fake collection and need no database.
// `ObjectId` (from the driver) makes the message id the document `_id`: ids are unique and grow with time,
// so they do not repeat after a restart the way a per-process counter does. Without it the hub counts itself.
// `ttlSeconds` (HISTORY_TTL_SECONDS) lets MongoDB delete messages older than that; 0 or empty keeps them forever.
const createMongoHistory = (collection, limit = 50, { ObjectId, ttlSeconds = 0 } = {}) => ({
  newId: ObjectId ? () => new ObjectId().toHexString() : undefined,
  // Indexes for the one query the history makes: the newest messages of a room.
  async init() {
    await collection.createIndex?.({ room: 1, _id: -1 });
    if (ttlSeconds > 0) await collection.createIndex?.({ createdAt: 1 }, { expireAfterSeconds: ttlSeconds });
  },
  async add(room, message) {
    const doc = { ...message, room, createdAt: new Date() };
    if (ObjectId && typeof message.id === 'string') doc._id = new ObjectId(message.id);
    await collection.insertOne(doc);
  },
  async list(room) {
    const newest = await collection.find({ room }).sort({ _id: -1 }).limit(limit).toArray();
    // Newest first in the query, oldest first for the client; the database fields stay inside.
    return newest.reverse().map(({ _id, createdAt, ...message }) => message);
  },
});

module.exports = { createHistory, createMongoHistory };
