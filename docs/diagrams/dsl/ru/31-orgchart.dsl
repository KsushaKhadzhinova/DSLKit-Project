diagram orgchart "Структура работ"
person owner "Владелица проекта"
person sup "Научный руководитель"
unit dev "Разработка"
unit qa "Качество"
unit doc "Документы"
person fe "Клиент и редактор"
person be "Сервер и база"
person tst "Тесты и аудит"
leads sup -> owner
leads owner -> dev
leads owner -> qa
leads owner -> doc
leads dev -> fe
leads dev -> be
leads qa -> tst
