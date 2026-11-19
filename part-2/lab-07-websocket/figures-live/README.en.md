# Check against a live MongoDB (Atlas)

The script [`../scripts/live-mongo-check.mjs`](../scripts/live-mongo-check.mjs) checks the chat history (`createMongoHistory`) on a real cluster. It is not part of `npm test`: without `MONGODB_URI` it prints `SKIP` and exits with code 0.

```bash
node --env-file=path/to/.env scripts/live-mongo-check.mjs   # LIVE_SKIP_TTL=1 skips the TTL wait
```

The connection string comes from the environment only and is never printed. The script uses collections `lab7_test_*` in the database of the connection string and drops only its own at the end.

## Result (2026-11-19): 15 of 15

Messages sent through socket clients in two rooms are stored with `ObjectId` ids. After a server restart the history is kept in the original order, rooms do not mix, and new ids are unique and greater than the old ones. The index `{room:1,_id:-1}` exists in Atlas. 10 clients sent 50 messages at once and all 50 are stored with unique ids. A reconnected client gets the history and new messages. With `HISTORY_TTL_SECONDS=2` a TTL index on `createdAt` is created, and the expired message was deleted by MongoDB in about 30 seconds (the TTL monitor runs once a minute). No bug found in the code. Full output: [`live-run.txt`](live-run.txt).
