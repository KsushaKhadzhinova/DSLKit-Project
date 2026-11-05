diagram uml state "Autosave"
initial i
state saved "Saved"
state editing "Editing the code"
final off
transition i -> saved
transition saved -> editing "change"
transition editing -> saved "1 s without edits"
transition saved -> off "close"
