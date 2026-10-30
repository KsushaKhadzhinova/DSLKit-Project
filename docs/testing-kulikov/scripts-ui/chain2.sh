cd /e/DSLKit-Project/docs/testing-kulikov/scripts-ui
for s in projects perf misc auth; do python $s.py > $s.log 2>&1; done
echo ALLDONE > chain2.done
