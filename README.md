# masterkey-api

Directivas para búsqueda y cotización de cursos
===============================================

Dependencias
------------

La aplicación donde se instalen las directivas debe tener instalada y funcionando los siguientes paquetes:
•	Angular 1.2 o superior
•	Angular UI-Select
•	Angular translate
•	Bootstrap 2.x o superior
•	Lodash 4.15

Instalación
-----------

La instalación se realiza mediante bower.

$ bower install masterkey-api


Implementación
--------------

Primero debe asegurarse de llamar las dependencias señaladas arriba y luego incluir el script de la directiva, dependiendo de las condiciones de la instalación podría ser así:

script href=”bower_components/masterkey/dist/js/masterkey-api.js”/


Configuración
-------------

Para configurar las directivas es necesario asegurarse de incluirlas en el módulo que las habrá de llamar. Ejemplo:
angular.module(“mymodule”, [“masterkey.api”])

Así el módulo “masterkey.api”, queda incluido en el módulo que la llamará, en este ejemplo “mymodule”.

Uso de las directivas
---------------------

Las directivas están diseñadas para ocupar el ancho total de la página, así que debe asegurarse de colocarlas en un espacio que pueda disponer del ancho total y donde pueda extenderse hacia abajo en forma libre.
Como cualquier directiva sólo se colocan las etiquetas HTML en el lugar conveniente.


Directiva para la búsqueda de cursos
------------------------------------

Para utilizar las directivas se puede emplear alguna de las formas estándar: Elemento o Atributo.
###Utilizar como elemento:
<mk-search mk-user=”idtoken”></mk-search>

###Utilizar como atributo:
<div data-mk-search data-mk-user=”idtoken”></div>
El atributo “mk-user” es utilizado para recibir el token de identificación del usuario, mismo que deberá ser asignado dinámicamente mediante una variable de “Angular JS”.

Directiva para cotizaciones
---------------------------

###Utilizar como elemento:
<mk-quote mk-user=”usertoken” mk-course=”courseid” mk-course-variant=”variantid”></mk-quote>

###Utilizar como atributo:
<div data-mk-quote data-mk-user=”usertoken” data-mk-course=”courseid” data-mk-course-variant=”variantid”></div>

Detalle de atributos
--------------------

•	mk-user. Utilizado para recibir el token de identificación del usuario, mismo que deberá ser asignado dinámicamente mediante una variable de “Angular JS”.
•	mk-course. Es el identificador del curso que se mostrará, podría recibirse mediante un parámetro URL y asignarse mediante “Angular JS”.
•	mk-course-variant. Es el identificador de “course variant” del curso que se mostrará, también podría recibirse mediante un parámetro URL y asignarse mediante “Angular JS”.

