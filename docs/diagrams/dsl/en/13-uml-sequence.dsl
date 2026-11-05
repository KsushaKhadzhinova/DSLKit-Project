diagram uml sequence "Sign in and create"
actor User "User"
participant Client "React client"
participant Api "Express server"
participant Db "PostgreSQL"
User -> Client : email and password
Client -> Api : POST /auth/login
Api -> Db : find the user
Db --> Api : password hash
Api --> Client : JWT token
User -> Client : new diagram
Client -> Api : POST /diagrams + token
Api -> Db : INSERT
Db --> Api : row created
Api --> Client : 201
