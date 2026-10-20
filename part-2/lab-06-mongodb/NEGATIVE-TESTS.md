# Negative tests, lab 6 (MongoDB)

File: `tests/negative.test.js` (28 tests, run on a temporary MongoDB). No defects were found: every wrong request is answered with a clear 4xx or 503 and the server keeps running.

| Scenario | Expected answer | Test |
| --- | --- | --- |
| Empty body | 400 | POST answers 400 for an empty body |
| Truncated JSON | 400, message mentions JSON | POST answers 400 for truncated JSON |
| `null`, array, string, number as body | 400 | POST answers 400 for JSON null, an array, a string and a number |
| Body sent as `text/plain` | 400 | POST answers 400 for a body that is not JSON content |
| Object nested 50 levels deep in a string field | 400 | POST answers 400 for a nested object where a string is expected |
| Number, boolean, array in a text field | 400 | POST answers 400 for numbers and booleans in text fields |
| Empty, tab-only, space-only, newline title | 400 | POST answers 400 for empty, tab-only and space-only titles |
| Title 81 characters long | 400 | POST answers 400 for a title one character over the limit |
| Emoji and right-to-left text | 201, text unchanged | POST accepts emoji and right-to-left text |
| NUL character in a title | 201 or 400, never 500 | POST answers 400 or stores a NUL character without a 500 |
| Priority -1, 1.5, "1", true, 3, 2147483648 | 400 | POST answers 400 for priority -1, 1.5, ... |
| Priority `1e309` in raw JSON | 400 | POST answers 400 for a priority written as 1e309 |
| Unknown notation | 400 | POST answers 400 for a notation outside the list |
| Forged `id`, `_id`, `role`, `createdAt`, `comments` | 201, fields ignored | POST ignores forged id, owner-like and timestamp fields |
| `' OR 1=1 --`, `{"$ne":null}` as values | stored as text, or 400 for an object | POST stores an operator-looking text as plain text |
| Operators, repeated keys, bad limit and skip in the query | 400 | GET list answers 400 for NoSQL operators in the query string |
| Ids `abc`, `-1`, `0`, `1.5`, `1e3`, `0x1`, `%`, `%00`, huge number, space, 5000 characters | 400 | GET by a malformed id answers 400 |
| Unknown route | 404 JSON | an unknown route answers 404 |
| `DELETE /diagrams` | 405 with `Allow` | an unsupported method answers 405 |
| Body 1 MB over the limit | 413 | a body one megabyte over the limit answers 413 |
| Two identical POST requests | two records | two identical POST requests create two records |
| PUT twice | same result, one record | a repeated PUT leaves the same result |
| PUT without required fields | 400 | PUT without required fields answers 400 |
| DELETE twice, then GET and PUT | 204, 404, 404, 404 | DELETE twice answers 204 and then 404 |
| Parallel PATCH to one record | all 200, valid record | parallel PATCH requests to one record |
| Blank comment author, 1001-character comment | 400 | a comment with a blank author or a too long text answers 400 |
| Comment on a missing diagram | 404 | a comment on a missing diagram answers 404 |
| Database not ready | 503 without internal details | with the database closed the API answers 503 |

Not covered here: authorization (the lab has no login), unsupported `Content-Type` answered with 415 (the lab answers 400, which is a clear error too).
