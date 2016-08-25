# Directivas para búsqueda y cotización de cursos

Dependencias
------------

La aplicación donde se instalen las directivas debe tener instalada y funcionando los siguientes paquetes:
* Angular 1.2 o superior
* Angular sanitize
* Angular UI-Select
* Angular translate
* Bootstrap 2.x o superior
* Lodash 4.15

Instalación
-----------

La instalación se realiza mediante bower.

$ bower install masterkey-api


Implementación
--------------

Primero debe asegurarse de llamar las dependencias señaladas arriba y luego incluir el script de la directiva, dependiendo de las condiciones de la instalación podría ser así:

        <script href=”bower_components/masterkey/dist/js/masterkey-api.js” />


Configuración
-------------

Para configurar las directivas es necesario asegurarse de incluirlas en el módulo que las habrá de llamar. Ejemplo:
angular.module(“mymodule”, [“masterkey.api”])

Así el módulo “masterkey.api”, queda incluido en el módulo que la llamará, en este ejemplo “mymodule”.

### Ruta de las plantillas
Las plantillas se encuentran en un subdirectorio denominado "templates", pero se debe configurar la ruta completa para encontrarlas.

En la configuración del módulo debe llamarse a la constante "configurations" donde se pueden cambiar los valores predeterminados en la búsqueda de plantillas y archivos de datos.

Para modificar la constante configurations:
        angular.module("mymodule").config(["configuratinos", function(configurations){ configurations.location.urlbase = "mypath" }]);

Existen dos variables con los datos de configuración:
* configurations.location y
* configurations.endpoint

La variable "location" contiene los datos relativos a las rutas en la ubicación de archivos de datos y plantillas.
Mientras qwue la variable "endpoint" contiene información para localizar los servicios Web para consulta y actualización de datos.

### Descripción de la variable configurations.location
A continuación se listan los valores disponibles para configurar asi como sus valores predeterminados.
* **location.urlbase**. Ruta base en la ubicación de los archivos. Valor predeterminado: "bower_components/"
* **location.home**. Ruta adicional para distinguir la ubicación de masterkey. Valor predeterminado: "masterkey-api/"
* **location.data**. Ubicación de los archivos de datos. Valor predetreminado: "data/"
* **location.templates**. Ubicación de las plantillas. Valor predeterminado: "templates/"

En la configuración predeterminada las plantillas se ubicarán en
"bower_components/masterkey-api/templates/"
mientras que los archivos de datos
"bower_components/masterkey-api/data/"

Modificando "configurations.location" se puede cambiar la ubicación de estos archivos.

### Descripción de la variable configurations.endpoint
A continuación se listan los valores disponibles para configurar así como sus valores predeterminados.
* **endpoint.host**. Nombre del host que contiene la Web API. Valor predeterminado: "dev.masterkeyeducation.com:8080"
* **endpoint.urlbase**. Ruta adicional para alcanzar los servicios Web. Valor predeterminado: "masterkey/"
* **endpoint.protocol**. Protocolo de comunicaciones. Valor predeterminado: "http".

Con estos valores predeterminados, los servicios Web se encontrarán en:
"http://dev.masterkeyeducation.com:8080/masterkey/"

Los cuales pueden modificarse para encontrar los servicios Web en otra ubicación.


Uso de las directivas
---------------------

Las directivas están diseñadas para ocupar el ancho total de la página, así que debe asegurarse de colocarlas en un espacio que pueda disponer del ancho total y donde pueda extenderse hacia abajo en forma libre.
Como cualquier directiva sólo se colocan las etiquetas HTML en el lugar conveniente.


Directiva para la búsqueda de cursos
------------------------------------

Para utilizar las directivas se puede emplear alguna de las formas estándar: Elemento o Atributo.
### Utilizar como elemento:
        <mk-search mk-user=”idtoken”></mk-search>

### Utilizar como atributo:
        <div data-mk-search data-mk-user=”idtoken”></div>
El atributo “mk-user” es utilizado para recibir el token de identificación del usuario, mismo que deberá ser asignado dinámicamente mediante una variable de “Angular JS”.

Directiva para cotizaciones
---------------------------

### Utilizar como elemento:
&lt;mk-quote mk-user=”usertoken” mk-course=”courseid” mk-course-variant=”variantid”&gt;&lt;/mk-quote&gt;

### Utilizar como atributo:
&lt;div data-mk-quote data-mk-user=”usertoken” data-mk-course=”courseid” data-mk-course-variant=”variantid”&gt;&lt;/div&gt;

Detalle de atributos
--------------------

* **mk-user**. Utilizado para recibir el token de identificación del usuario, mismo que deberá ser asignado dinámicamente mediante una variable de “Angular JS”.
* **mk-course**. Es el identificador del curso que se mostrará, podría recibirse mediante un parámetro URL y asignarse mediante “Angular JS”.
* **mk-course-variant**. Es el identificador de “course variant” del curso que se mostrará, también podría recibirse mediante un parámetro URL y asignarse mediante “Angular JS”.

