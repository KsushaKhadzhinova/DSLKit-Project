diagram uml state "Autosave"
initial i
state saved "Saved"
state typing "Typing"
state waiting "Waiting one second"
final off
transition i -> saved
transition saved -> typing "edit"
transition typing -> waiting "pause"
transition waiting -> saved "1 s quiet"
transition saved -> off "close"
