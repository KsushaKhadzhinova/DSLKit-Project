diagram uml timing "Autosave over time"
lifeline editor "Editor" states Idle, Typing
lifeline note "Indicator" states Saved, Saving
at 0 editor Idle
at 0 note Saved
at 10 editor Typing
at 10 note Saving
at 30 editor Idle
at 40 note Saved
