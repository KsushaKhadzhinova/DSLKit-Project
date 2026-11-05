diagram uml usecase "DSLKit use cases"
actor Author "Author"
actor Admin "Administrator"
usecase write "Write diagram code"
usecase draw "See the diagram"
usecase export "Export"
usecase import "Import Mermaid and PlantUML"
usecase signin "Sign in"
usecase list "Keep a list of diagrams"
usecase users "Manage users"
link Author -> write
link Author -> export
link Author -> import
link Author -> list
link Admin -> users
include write -> draw
include list -> signin
include users -> signin
