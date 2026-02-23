
# Diseño de la base de datos
## ¿Qué esquema de claves utilizarías? 
#### Indica qué información almacenarías en la clave primaria de la tabla
## ¿Utilizarías únicamente una clave de partición, o ves conveniente utilizar también una clave de ordenación? ¿Por qué?

Dado los casos de uso indicados en en enuncuado: 
1. Un usuario debe poder ver todas sus notas
2. Un usuario debe poder realizar acciones sobre una nota específica

La **Partition Key (PK)** debería ser el id del usuario (ya se un hash del email, UUIDs, combinaciones de ambas...), y como **Sort Key (SK)** deberíamos utilizar el id de la nota. Con estas 2 configuraciones cubrimos los casos de uso indicados, podemos acceder tanto a las notas por usuario y a cada nota de este. En un futuro, cuando se necesite y se generen más casos de uso podremos generear GSIs para cubrir los nuevos escenarios.

# Creación de la base de datos
## ¿Se corresponde el diseño de claves con lo que habías pensado?
Si, la estructura se corresponde a lo que había pensado: un userId como PK (hash key) y una noteId como SK (range key).
