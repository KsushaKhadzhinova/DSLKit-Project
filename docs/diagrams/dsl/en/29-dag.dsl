diagram dag "Checks before a release"
task install "Install" duration=2
task format "Format" duration=1
task test "Tests" duration=6
task audit "Dependency audit" duration=1
task build "Build" duration=3
task report "Report" duration=1
depend install -> format
depend install -> test
depend install -> audit
depend test -> build
depend format -> build
depend build -> report
depend audit -> report
