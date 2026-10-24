diagram idef3 "User sign-in"
uob u1 "Receive email and password"
uob u2 "Check the lock"
xor j1
uob u3 "Compare the password hash"
uob u4 "Answer 429"
xor j3
uob u5 "Issue the token"
uob u6 "Answer 401"
xor j4
xor j2
uob u7 "Send the answer"
referent r1 "Sign-in limits"
precedence u1 -> u2
precedence u2 -> j1
precedence j1 -> u3
precedence j1 -> u4
precedence u3 -> j3
precedence j3 -> u5
precedence j3 -> u6
precedence u5 -> j4
precedence u6 -> j4
precedence j4 -> j2
precedence u4 -> j2
precedence j2 -> u7
relational r1 -> u2
