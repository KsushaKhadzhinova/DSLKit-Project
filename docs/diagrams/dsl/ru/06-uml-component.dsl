diagram uml component "Компоненты редактора"
component parser "Разбор кода"
component engine "Движки отрисовки"
component store "Хранилище"
component ui "Интерфейс редактора"
interface IParse
interface IDraw
interface ISave
provide parser -> IParse
provide engine -> IDraw
provide store -> ISave
require ui -> IParse
require ui -> IDraw
require ui -> ISave
