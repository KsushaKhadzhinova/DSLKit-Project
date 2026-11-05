diagram uml composite "Editor page"
classifier page "Editor page"
part code "Code field" in=page
part canvas "Canvas" in=page
part problems "Problems panel" in=page
port pc "text" of=code
port pv "model" of=canvas
port pp "errors" of=problems
connect pc -> pv "code"
connect pc -> pp "check"
