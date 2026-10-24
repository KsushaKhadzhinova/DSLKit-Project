diagram uml package "Пакеты site/js"
package components "components: компоненты"
package notations "notations: нотации"
package engines "engines: движки"
package storage "storage: хранилище"
package api "api: обращения к серверу"
package utils "utils: помощники"
import components -> notations
import components -> engines
import components -> storage
import components -> api
import components -> utils
import engines -> notations
import notations -> utils
import storage -> utils
