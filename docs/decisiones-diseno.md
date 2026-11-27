# Decisión de diseño: arquitectura sin patrón de diseño

Para este proyecto decidimos con el grupo no aplicar un patrón de diseño y
mantener una arquitectura convencional basada en `services` y `controllers`.
Dado el tamaño reducido del sistema, incorporar un patrón habría implicado un
nivel de abstracción y complejidad innecesarios, cayendo en sobreingeniería o
sobrediseño. La estructura elegida resulta suficiente para separar la lógica de
negocio de la capa HTTP, mantener el código claro y facilitar su mantenimiento
sin agregar capas que el proyecto no necesita.

## Contexto

El proyecto es una API REST de alcance reducido, organizada en módulos bien
delimitados (usuarios, pacientes, profesionales, turnos, agendas, espacios y
estudios). La lógica de cada módulo es directa y no requiere cambiar entre
implementaciones ni reglas de negocio extensas que justifiquen una capa
adicional de abstracción.

## Estructura adoptada

El flujo de cada request sigue la separación habitual:

- `controllers`: reciben el request, validan la forma básica de los datos y
  delegan en el service correspondiente.
- `services`: concentran las reglas de negocio y las operaciones sobre los
  modelos.
- `models`: representan las tablas y la persistencia con Sequelize.

`routes`, `validators`, `middlewares`, `errors` y `utils` acompañan ese flujo
sin introducir una capa de patrón entre controller y service.

## Consecuencias y revisión

La decisión reduce el codigo repetitivo, facilita seguir el recorrido de un request y
baja la curva de aprendizaje para quienes quieran entender el funcionamiento de este proyecto. Como
contrapartida, si el dominio crece o surgen varias implementaciones
intercambiables de una misma operación, la decisión debe reevaluarse y
considerarse un patrón como Repository o Strategy en ese momento, no desde el
inicio.
