# Questions for the owner (22 October 2026)

Russian version: `33-QUESTIONS.md`. Answer by number: "1 yes, 2 no, 3 option B". For anything unanswered I follow the option marked "default".

## A. Part 1 site

1. Should the canvas have a "Retry" button on a Kroki error, separate from "Draw again"? (default: no, the existing button is enough)
2. How to show a Kroki error: text in the status line (as now) or a frame on the canvas with an icon? (default: the status line)
3. What to do on partial success when the diagram has parse warnings: draw and show the problems panel? (default: yes)
4. Do you need a language switch right in the editor, or only in the settings? (default: only the settings)
5. Do you need SVG and PNG export from the editor? (default: no)
6. Do you need example diagrams for each of the 27 notations in an "Open example" menu? (default: hints exist, I add no templates)
7. Should I upload the mockups to Figma through your browser window while you are signed in? (default: no, I wait for your sign-in)
8. Should I re-shoot the Mermaid frames as soon as Kroki works, without a separate request? (default: yes)

## B. Extras and improvements

9. Do extras for lab 4, P2 and lab 8? (default: yes, one work at a time)
10. Do the medium extras (a `?notation=` filter, graceful shutdown, lock limits in `limits.json`, notation editing and auto-retry in lab 5)? (default: yes)
11. Add `GET /health` to P1 and P2? (default: yes)
12. Add a `lint` script (ESLint and Prettier) to the server works? (default: no)
13. Implement undo in P4? (default: no)
14. Enable `connectionStateRecovery` in the lab 7 Socket.IO? (default: no)
15. Implement a pause for a slow connection (lab 7 question 15)? (default: no, the answer is in the guide)
16. Do you need `basename` and a `HashRouter` mode in P3? (default: no)
17. Do you need a pgAdmin or Redis service in the lab 8 `docker-compose.yml`? (default: no)
18. Change the lab 8 default ports to 80 and 5000 as in the assignment? (default: no, 8080 and 3000, and 80 and 5000 are enabled through `.env`)
19. Do you need a "Clear log" button in P1? (default: no)
20. Do you need the P2 API described in OpenAPI? (default: no)

## C. Quality and documentation

21. Do refactoring round 2 (`App.jsx` of lab 5, the notation render functions)? (default: yes, after the extras)
22. Add an architecture paragraph with Martin and Fowler references to the reports of labs 1–3? (default: yes)
23. Do you need a separate "write it live" cheat-sheet file covering all 12 works? (default: no, each guide has one)
24. Do you need the Mermaid diagrams of the guides as PNG for printing? (default: no)
25. Do you need a guide for the course project (branch `course-project`)? (default: no, the branch is untouched)

## D. Git and handing in

26. Merge the Part 1 branches into `main` and push? (default: no, I wait for your yes)
27. Delete the local branches `claude/...` and `worktree-agent-...`? Their names contain the word claude. (default: untouched)
28. Keep the 51 MB of mockups in Git or move them to a separate archive? (default: keep in Git, as you said)
29. Push the Part 2 work branches one by one to separate branches on GitHub? (default: no)
30. How to sign pull requests: with no AI marks at all? (default: yes, no marks)

## E. For the teacher (questions to ask them)

31. For an even variant, must the lab 1 data live in a database or in an array?
32. P3 asks for React Router v6 but the work has v7: is that acceptable?
33. How to show the 500 page in client-only works where a real failure is impossible?
34. Is SQLite acceptable instead of PostgreSQL in labs 2 and 3?
35. Are screenshots of every endpoint needed, or one per operation?
