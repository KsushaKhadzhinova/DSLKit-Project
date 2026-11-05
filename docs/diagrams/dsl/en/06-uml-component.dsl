diagram uml component "Editor components"
component parser "Code parser"
component engine "Drawing engines"
component store "Storage"
component ui "Editor interface"
interface IParse
interface IDraw
interface ISave
provide parser -> IParse
provide engine -> IDraw
provide store -> ISave
require ui -> IParse
require ui -> IDraw
require ui -> ISave
