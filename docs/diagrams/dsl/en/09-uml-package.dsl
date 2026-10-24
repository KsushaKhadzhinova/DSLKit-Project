diagram uml package "Packages of site/js"
package components "components"
package notations "notations"
package engines "engines"
package storage "storage"
package api "api: server calls"
package utils "utils: helpers"
import components -> notations
import components -> engines
import components -> storage
import components -> api
import components -> utils
import engines -> notations
import notations -> utils
import storage -> utils
