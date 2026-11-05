cd /e/DSLKit-Project/docs/testing-kulikov/scripts-ui
for s in editor projects perf; do python $s.py > $s.log 2>&1; done
echo ALLDONE > chain.done
