diagram petri "Sign-in attempts"
place left "Attempts left" tokens=5
place failed "Failures"
place locked "Locked"
transition fail "Wrong password"
transition lock "Lock"
arc left -> fail
arc fail -> failed
arc failed -> lock weight=5
arc lock -> locked
