diagram dag "Проверки перед выпуском"
task install "Установка" duration=2
task format "Формат" duration=1
task test "Тесты" duration=6
task audit "Аудит зависимостей" duration=1
task build "Сборка" duration=3
task report "Отчёт" duration=1
depend install -> format
depend install -> test
depend install -> audit
depend test -> build
depend format -> build
depend build -> report
depend audit -> report
