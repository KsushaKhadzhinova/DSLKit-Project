diagram orgchart "Structure of the work"
person owner "Project owner"
person sup "Supervisor"
unit dev "Development"
unit qa "Quality"
unit doc "Documents"
person fe "Client and editor"
person be "Server and database"
person tst "Tests and audit"
leads sup -> owner
leads owner -> dev
leads owner -> qa
leads owner -> doc
leads dev -> fe
leads dev -> be
leads qa -> tst
