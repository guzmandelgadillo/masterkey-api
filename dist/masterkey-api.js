(function () {
    'use strict';
    angular.module("masterkey.api", ["ngSanitize", "ui.select", "pascalprecht.translate", "checklist-model", "ui.bootstrap.tpls", "ui.bootstrap.datepickerPopup"]).config(["configurations", configure]);
    function configure(configurations) {
    }
})();

(function (angular) {
    angular.module("masterkey.api").constant("configurations", {
        endpoint: {
            "authTenant": "dev",
            "authToken": "",
            "host": "dev.masterkeyeducation.com:8080",
            "protocol": "http",
            "urlbase": "masterkey/",
            "server": "agency/"
        },
        location: {
            "urlbase": "/Scripts/", //"bower_components/",
            "home": "masterkey/", // -api/",
            "data": "data/",
            "templates": "templates/"
        }
    });
})(angular);


(function(angular){ 'use strict';

var app = angular.module('masterkey.api');

/**
 * Los level service to create Command Objects
 */
app.service('commandGenerator', function(converterService){

  function CommandGenerator(){}

  function compile(dsl){
    return converterService.compile(dsl);
  }

  /**
   * Object to handle pagination from state and request
   */
  function PaginationCommand(meta, pageSize){
    angular.extend(this, meta);

    this.defaultPageSize = this.defaultPageSize || pageSize; 

    this.max = this.max || this.defaultPageSize;
    this.offset = this.offset || 0;

    // Page is only available when we have results
    if(!this.current){
      this.current = this.max ? (Math.ceil(this.offset / this.max) + 1) : 0;
    }

    this.total = this.totalCount ? Math.ceil(this.totalCount / this.max) : 0;
  }

  /**
   * Marshaller to return state or query date
   * @return {Object} 
   */
  PaginationCommand.prototype.getParams = function(){
    return {
      max: this.max || null,
      offset: (this.max * (this.current - 1)) || null
    };
  };

  /**
   * Wrapper to create a command from a staet
   * @param  {QueryCommand} QueryCommand 
   * @param  {Object} dsl          to be used with converterService
   * @return {Function}              
   */
  CommandGenerator.prototype.createFromState = function(QueryCommand, dsl){
    var marshal = compile(dsl);

    return function createFromState(params){
      var data = marshal(params);
      var page = new PaginationCommand(params, QueryCommand.pageSize);

      return new QueryCommand(data, page);
    };
  };

  /**
   * Wrapper function to convert a command object to stateParams
   * @param  {Object<String,Function>} dsl 
   * @return {Function}     
   */
  CommandGenerator.prototype.toStateParams = function(dsl){
    var marshal = compile(dsl);

    return function toStateParams(query){
      var data = marshal(query);
      var page = new PaginationCommand(query.page).getParams();

      return angular.extend(data, page);
    };
  };

  /**
   * Wrapper to bind request data and create a new QueryCommand
   * @param  {QueryCommand} QueryCommand 
   * @param  {Object<String,Function>} dsl 
   * @return {Function}
   */
  CommandGenerator.prototype.bindQuery = function(QueryCommand, dsl){
    var marshal = compile(dsl);

    return function(request){
      var data = marshal(request.query || request.meta.filter);
      var page = new PaginationCommand(request.meta, QueryCommand.pageSize);

      return new QueryCommand(data, page);
    };
  };

  /**
   * Qrapper to a function to convert a queryCommand into params
   * to be sent to server
   * @param  {Object<String, Function>} dsl 
   * @return {Function}     [description]
   */
  CommandGenerator.prototype.toQueryParams = function(dsl){
    var marshal = compile(dsl);

    return function toQueryParams(query){
      var data = marshal(query);
      var page = new PaginationCommand(query.page).getParams();

      return angular.extend(data, page);
    };
  };

  /**
   * Boilerplate to  Add Query methods to a command Object
   * @param {Object<String,Object} config 
   * @param {queryCommand} config 
   */
  CommandGenerator.prototype.addQueryMethods = function(QueryCommand, config){

    var self = this;
    var methods = {
      fromState: function(QueryCommand, dsl){
        QueryCommand.createFromState = self.createFromState(QueryCommand, dsl);

        return QueryCommand;
      },

      toState: function(QueryCommand, dsl){
        var toState = self.toStateParams(dsl);

        QueryCommand.prototype.toStateParams = function(){
          return toState(this);
        };

        return QueryCommand;
      },

      fromQuery: function(QueryCommand, dsl){
        QueryCommand.prototype.bindQuery = self.bindQuery(QueryCommand, dsl);

        return QueryCommand;
      },

      toQuery: function(QueryCommand, dsl){
        var toQuery = self.toQueryParams(dsl);

        QueryCommand.prototype.toQueryParams = function(){
          return toQuery(this);
        };

        return QueryCommand;
      }
    };

    //@TODO Filter keys

    // Add methods
    return _.reduce(Object.keys(config), function(cmd, key){
      return methods[key](cmd, config[key]);
    }, QueryCommand);
  };

  return new CommandGenerator();
});

})(angular);
(function() { 'use strict';

var app = angular.module('masterkey.api');

/**
 * Service to convert an object into another using a
 * user defined functions.
 */
app.service('converterService', function(){
  
  function ConverterService(){}
  
  /**
   * List of default filters of th converter service
   */
  var filters = {

    /**
     * Return the id of a given object, useful to send 
     * a list 
     * @param  {Object} val 
     * @return {Mixed} id value of the object
     */
    id: function id(val){
      if(val){ return val.id }
    },

    /**
     * Definition used to get the value of another property
     * of the object.
     *
     * e.g. if 
     * @param  {String} property 
     * @return {Function}          
     */
    alias: function alias(property){

      /**
       * returned function that will return the value of the given
       * property
       * @param  {Object} obj to be converted
       * @return {Mixed}     
       */
      return function(val, obj){
        return obj[property];
      };

    },

    /**
     * Wrapper function that allows returning the given value
     * 
     * @param  {Mixed} val 
     * @return {Function}     
     */
    defaultValue: function(defaultValue){

      /**
       * Function that will return the value of the parent function
       * @return {Mixed}
       */
      return function(val){ 
        return (val === null || val === undefined) ? defaultValue  : val;
      };
    },

    /**
     * Filter that map the given value into a different
     * value taken from the object given
     *
     * @param  {Object<String, Mixed} Object to map all propertuies that will be converted 
     * @return {Function}
     */
     map: function map(mapper){

      /**
       * Function taht will take the value to find the
       * key in the object and return its value.
       * If a key is not found, then null is returned
       * 
       * @param  {String} val 
       * @return {Mixed} 
       */
      return function(val){
        return mapper.hasOwnProperty(val) ? mapper[val] : null;
      };
    },

    /**
     * Function to preserve the same value, should
     * be used when no modifications are required
     * 
     * @return {Function} 
     */
    eq: function eq(val){
      return val;
    },

    /**
     * Return a value that is greater or equal to the min value given
     * Even if the real valid is lower
     * @param {Integer} 
     * @return {Function} 
     */
    min: function min(minValue){

      /**
       * Return the minValue if the params is lower itherwise
       * the real value is returned
       * @param  {Integer} val 
       * @return {Integer}     
       */
      return function(val){
        return val < minValue ? minValue : val;
      };
    },

    /**
     * Return a value that is lower or equal to the max value given
     * Even if the real valid is greater
     * 
     * @param {Integer} 
     * @return {Function} 
     */
    max: function max(maxValue){

      /**
       * Return the maxValue if the params is lower itherwise
       * the real value is returned
       * @param  {Integer} val 
       * @return {Integer}     
       */
      return function(val){
        return val > maxValue ? maxValue : val;
      };
    },

    /**
     * Return a new compiler for the given object,
     * allows inheritance
     * @param  {Object<String, Function>} dls
     * @return {Function}       
     */
    embed: function(dsl){

      var format = new ConverterService().compile(dsl);

      /**
       * Compile and object or a collection using the dsl
       */
      return function embed(data){
        var isArray = angular.isArray(data);

        return isArray ? _.map(data, format) : format(data);
      };
    },

    /**
     * Opposite of id, takes a single element and wraps inside
     * and object, assigning the current value to the property
     * @param  {[type]} property [description]
     * @return {[type]}          [description]
     */
    wrap: function(property){
      
      return function wrap(data){
        var val = {};
        val[property] = data;

        if(data){ return val }
      };
    }
  };

  /**
   * Create a function that will use all definitions
   * to generate a new object
   * 
   * Returned function should be used inside objects, since
   * this is a low level service, example:
   *
   *   var converter = converterService.compile(definition)
   *   Command.prototype.convert = function(){ converter(this) }
   *
   *another example used inside constructor
   *
   *   var conveter = converterService.compile(definition)
   *   function Command(params){
   *     angular.extend(this, converter(params));
   *   }
   * 
   * @param  {Object<String, Function|Array<Function>}
   * @return {Function}            
   */
  ConverterService.prototype.compile = function(dsl){

    if(!dsl || !angular.isObject(dsl)){
      throw new Error('DSL can be compiled, invalid argument: ' + dsl);
    }

    /**
     * Function that will take a list of functions that will be
     * applied to the property of the given object
     *
     * It is not a validator, even though some filters adjust the value
     * the converter will always be a returned value
     * 
     * @param  {Array<Function>|Function} definition 
     * @param  {Object} obj        
     * @param  {String} property   
     * @return {Mixed}            
     */
    function convert(definition, obj, property){
      // Normalize to arrays
      definition = angular.isArray(definition) ? definition : [definition];

      // Initial value is the object property
      var initialValue = obj[property];

      return _.reduce(definition, function(val, d){

        // Assert definition is a function
        if(!angular.isFunction(d)){
          throw new Error(d+' is not a function, property cannot be converted'+property);
        }

        return d(val, obj, property);

        // var value = d(val, obj, property);
        // Return undefined if key doesn't have any value
        // return (value === null || value === undefined) ? undefined  : value;

      }, initialValue);
    }

    /**
     * Convert the given object into a a new object 
     * using all transformations in dsl params
     * 
     * @param {Object} object
     * @return {Object}
     */
    return function Converter(obj){

      var properties = Object.keys(dsl);

      return _.reduce(properties, function(result, prop){
        result[prop] = convert(dsl[prop], obj, prop);
        return result;
      }, {});
    };
  };

  /**
   * Method to get default filters
   * 
   * @return {Object} 
   */
  ConverterService.prototype.getDefaultFilters = function(){ return filters };

  return new ConverterService();
});

})();
(function (angular) {
    'use strict';
    angular.module('masterkey.api')
      .factory('courseService', ["futureObjectService", courseService]);
    function courseService(futureService) {
        var variantLoadedProperty = '$courseVariantLoaded';
        function addToCourseList(courseVariantList, courseList) {
            var courses = _.reduce(courseVariantList, function (courses, variant) {
                var course = _.find(courses, { id: variant.courseId });

                // Inititalize courseVariant
                if (course && !course[variantLoadedProperty]) {
                    course.courseVariant = course.courseVariant || [];
                    course.courseVariant.push(variant);
                }

                return courses;

            }, courseList);


            return _.map(courses, function (course) {
                course[variantLoadedProperty] = true;
                return course;
            });
        }

        function getCourse(courseId) {
            var url = "course/" + courseId;
            return futureService.getFutureSingleObject(url);
        }

        function getCourseVariant(courseId, courseVariantId) {
            var url = "agency/course/" + courseId + "/courseVariant/" + courseVariantId;
            return futureService.getFutureSingleObject(url);
        }

        function getPlace(placeId, placeType) {
            var url = "agency/place/" + placeType.toLowerCase() + "/" + placeId;
            return futureService.getFutureSingleObject(url);
        }

        function findAllAssociatedByCourse(courseId) {
            var url = 'agency/associatedService';
            var params = { course: courseId };
            return futureService.getFuturePagedObject(url, params);
        }

        function findAllProvidedByCourse(courseId) {
            var url = 'providerService';
            var params = { course: courseId };
            return futureService.getFuturePagedObject(url, params);
        }

        function listAccommodationByCourse(courseId) {
            var url = 'agency/course/' + courseId + '/accommodation';
            return futureService.getFuturePagedObject(url);
        }

        function listByCourse(courseIds) {
            var
            url = 'agency/courseVariant/course',
            params = { 'course': courseIds };

            return futureService.getFuturePagedObject(url, params);
        }

        function listByCourseVariant(courseVariantId) {
            var url = "agency/courseVariant/" + courseVariantId + "/courseEvent"
            return futureService.getFuturePagedObject(url);
        }

        function listByPlaceAndCourseType(place, courseType, params) {
            var max = 750;
            var url = "agency/course/" + courseType;
            var filters = angular.extend({ max: max }, params);
            filters[place.type] = place.id;

            return futureService.getFuturePagedObject(url, filters);
        }

        function listOptionalPromotion(courseId) {
            var url = "agency/course/" + courseId + "/agencyPromotion";
            return futureService.getFuturePagedObject(url);
        }

        function listSales(query) {
            var url = "agency/sale";
            return futureService.getFuturePagedObject(url, query);
        }

        function loadAndBindToCourseList(courseList) {
            var
            addTo = addToCourseList,
            courses = _.filter(courseList, function (course) {
                return course[variantLoadedProperty] !== true;
            });

            if (!courses.length) { return courseList }
            var variantsList = listByCourse(_.map(courses, function (item) { return item.id; }));
            return variantsList.$promise.then(function (courseVariantList) {
                return addTo(variantsList, courses);
            });
        }

        function postCreateDraft(draft) {
            var url = "agency/draft/";
            return futureService.postPromise(url, draft);
        }

        function queryByCourseType(search, courseType) {
            var url = "agency/place/" + courseType;
            var params = { "q": search };

            return futureService.getFuturePagedObject(url, params);
        }

        return {
            findAllAssociatedByCourse: findAllAssociatedByCourse,
            findAllProvidedByCourse: findAllProvidedByCourse,
            getCourse: getCourse,
            getCourseVariant: getCourseVariant,
            getPlace: getPlace,
            listAccommodationByCourse: listAccommodationByCourse,
            listByCourseVariant: listByCourseVariant,
            listByPlaceAndCourseType: listByPlaceAndCourseType,
            listOptionalPromotion: listOptionalPromotion,
            listSales: listSales,
            loadAndBindToCourseList: loadAndBindToCourseList,
            postCreateDraft: postCreateDraft,
            queryByCourseType: queryByCourseType
        };
    };
})(angular);

  
(function (angular) {
    'use strict';

    angular.module('masterkey.api')

    /**
     * Factory to load CouorseType configuration
    */
    .factory('CourseType', function (dataFile) {

        var
        file = 'courseType',
        defaultValues = {
            language: true,
            category: true,
            area: true
        };

        function CourseType(params) {
            angular.extend(this, params, defaultValues);
        }

        CourseType.get = function (type) {

            return CourseType.query().then(function (courseTypesList) {
                return _.find(courseTypesList, { value: type });
            });
        };

        /**
         * Load data from local server with the CourseType configuration
         * 
         * @return {Promise} 
         */
        CourseType.query = function () {
            return dataFile.loadSource(file).then(function (courseTypes) {
                return courseTypes.map(function (it) { return new CourseType(it) });
            });
        };

        return CourseType;
    });
})(angular);



(function (angular) {
    'use strict';
    angular.module("masterkey.api").service("currencyService", ["endpointService", currencyService])
    function currencyService(endpoints) {
        function T() { };
        var urlCurrencySrv = "catalog/currency/";
        var KEY = "currency";
        var rates = {};

        /**
         * Convert an amount using the rates and the code given
         *     
         * @param  {Integer} amount         
         * @param  {String} currencyCode 
         * @param  {Object<String, Float>} rates        
         * @return {Float}              converted price
         */
        T.prototype.convert = function (amount, currencyCode, rates) {
            var rate = rates[currencyCode];
            return amount / rate;
        };

        /**
         * Default currency is used when no currency is given
         */
        T.prototype.defaultCurrency = {
            currency: 'USD',
            currencyName: 'Dollar'
        };

        /**
         * Load exchangeCurrency
         * @return {Currency} 
         * 
         * @deprecated  use CurrencyService.convert instead
         */
        T.prototype.loadExchangeCurrency = function (code) {
            code = code || this.defaultCurrency.currency;
            return loadRates(code).then(function (rates) {
                return {
                    currency: code,
                    rates: rates
                };
            });
        };

        return new T();

        function loadRates(codeBase) {
            var url = urlCurrencySrv + codeBase;
            return endpoints.get(url).then(function (currency) {
                return saveRates(codeBase, currency.rates);
            });
        }

        /**
         * Save currency rates in memory
         * @param  {Currency} currency 
         * @param  {[type]} rates    [description]
         * @return {[type]}          [description]
         */
        function saveRates(base, rawRates) {
            rates[base] = _.reduce(rawRates, function (result, rate) {
                result[rate.currency] = rate.rate;
                return result;

            }, {});

            return rates[base];
        }
    }
})(angular);


(function (angular) {
    'use strict';
    angular.module('masterkey.api')
    .service('dataFile', ["$http", "configurations", function ($http, configurations) {

        var ext = '.json';
        var settings = configurations.location;
        var endpoint = configurations.endpoint;
        var server = endpoint.protocol + "://" + endpoint.host + "/";
        var dataPath = settings.urlbase + settings.home + settings.data;
        var templatesPath = settings.urlbase + settings.home + settings.templates;
        var imagesPath = server + "cdn/";

        function get(source, key) {
            return loadSource(source).then(function (data) {
                return key, data[key];
            });
        }

        function loadSource(source) {
            return $http.get(dataPath + source + ext, { cache: true })
                .then(function (response) { return response.data });
        }

        function setAuthToken(token) {
            configurations.endpoint.authToken = token;
        }

        return {
            dataPath: dataPath,
            get: get,
            imagesPath: imagesPath,
            loadSource: loadSource,
            setAuthToken: setAuthToken,
            templatesPath: templatesPath
        }
    }]);
})(angular);

(function (angular) {
    'use strict';

    angular.module('masterkey.api')

      /**
       * Factory used to hold all necesary information to request a draft
       */
      .factory('DraftCommand', function () {

          function DraftCommand(course, courseVariant, courseEvent) {

              /**
               * Course used to generate the quote
               */
              this.course = course;

              /**
               * CouorseLine is the main
               */
              this.courseLine = {
                  product: courseVariant,
                  event: courseEvent
              };

              /**
               * AssociatedServices are sotred in an object where the key is the
               * object id and the value is the command to add, remove and configure 
               * the service
               */
              this.associatedServiceLine = {};

              /**
               * List of selected promotions
               */
              this.agencyPromotionList = [];

          }


          /**
           * Add associatedServices if they are not already added
           * 
           * @param {Object<Integer, AssociatedServiceLineCommand>} associatedServiceLineCommand 
           */
          DraftCommand.prototype.addAssociatedService = function (associatedServiceLineCommand) {

              var keys = Object.keys(associatedServiceLineCommand);

              this.associatedServiceLine = _.reduce(keys, function (all, key) {

                  all[key] = all[key] || associatedServiceLineCommand[key];

                  return all;

              }, this.associatedServiceLine);
          };

          return DraftCommand;
      });
})(angular);


  
(function (angular) {
    'use strict';
    angular.module("masterkey.api").factory("endpointService", ["$http", "configurations", endpointService]);
    function endpointService($http, configurations) {
        var settings = configurations.endpoint;
        var apiPath = settings.protocol + "://" + settings.host + "/" + settings.urlbase;

        function get(url, params) {
            var headers = getHeaders();
            var uri = apiPath + url;
            var config = {
                params: params,
                headers: headers
            };
            return $http.get(uri, config).then(function (response) { return response.data; });
        }

        function post(url, data, params) {
            var headers = getHeaders();
            var uri = apiPath + url;
            var config = {
                data: data,
                params: params,
                headers: headers
            };
            return $http.post(uri, data, config);
        }

        function getHeaders() {
            return {
                "X-Auth-Token": settings.authToken,
                "X-Auth-Tenant": settings.authTenant
            };
        }

        return {
            apiPath: apiPath,
            get: get,
            headers: getHeaders,
            post: post
        }
    }
})(angular);


(function (angular) {
    'use strict';

    angular.module('masterkey.api')

        /**
         * Filter to format evetn, uses date and translate
         */
        .filter('eventFormat', function ($filter) {
            return function EventFilter(event) {
                var
                start = $filter('date')(event.start, 'fullDate'),
                duration = (event.duration) ? $filter('translate')('event.duration.' + event.duration.term, event.duration) : '';

                return start + ' [' + duration + ']';
            };
        });
})(angular);


(function (angular) {
    'use strict';

    angular.module('masterkey.api').factory('futureObjectService',
        ["$http", "BackendPagination", "endpointService", futureService]);
    function futureService($http, BackendPagination, endpoints) {
        function getPromise(url, params, format) {
            return getFutureObject(url, params, format).$promise;
        }
        
        function getDataPromise(promise, format) {

            function getDelegate(format) {
                if (format === 'single') { return promiseSingle; }
                if (format === 'list') { return promiseOldArray; }
                return promiseListPaged;
            }

            function delegateError(error) {
                data.$resolved = true;
                data.$error = error ? (error.statusText || 'Error!') : 'Error!';
                return error;
            }

            var delegate = getDelegate(format);
            var data = getDatacontainer(format);
            data.$resolved = false;
            data.$promise = promise.then(delegate, delegateError);
            
            
            function promiseSingle(response) {
                angular.extend(data, response);
                data.$resolved = true;
                return data;
            }
            
            function promiseListPaged(response) {
                response.resourceList.forEach(function (item) {
                    data.push(item);
                });
                if (response.meta){
                    data.$meta = new BackendPagination(response);
                }
                data.$resolved = true;
                return data;
            }
            
            function promiseOldArray(response) {
                response.forEach(function (item) {
                    data.push(item);
                });
                data.$resolved = true;
                return data;
            }
            
            return data;
        }

        function getFutureObject(url, params, format) {
            return getDataPromise(endpoints.get(url, params), format);
        }
        
        function getFuturePagedObject(url, params) {
            return getFutureObject(url, params, 'listPaged');
        }

        function getFutureSingleObject(url, params) {
            return getFutureObject(url, params, "single");
        }
        
        function getDatacontainer(format) {
            if (format !== 'single'){ return [] }
            return {};
        }

        function postPromise(url, data, params) {
            return endpoints.post(url, data, params);
        }

        return {
            getDataPromise: getDataPromise,
            getFutureObject: getFutureObject,
            getFuturePagedObject: getFuturePagedObject,
            getFutureSingleObject: getFutureSingleObject,
            getPromise: getPromise,
            postPromise: postPromise
        };
    };
})(angular);


(function (angular) {
    angular.module("masterkey.api").factory("lineCommand", lineCommand);
    function lineCommand() {
        function T(product) {
            this.added = false;
            this.product = product;
            this.qty = 1; //@TODO Add defautl qty inspecting product
        }

        T.prototype.add = function () {
            this.added = true;
        };

        T.prototype.remove = function () {
            this.added = false;
        };

        return T;
    }
})(angular);


(function (angular) {
    angular.module('masterkey.api').directive('mkQuoteAccommodation', ["dataFile", quoteAccommodation]);
    function quoteAccommodation(paths) {
        function link(scope, elem, attrs) {

            scope.datepicker = {
                isOpen: false
            };

            scope.toggle = function () {
                scope.datepicker.isOpen = true;
            };
        }

        return {
            link: link,
            templateUrl: paths.templatesPath + 'mk-quote-accommodation.html'
        };
    }
})(angular);

(function (angular) {
    angular.module("masterkey.api").directive("mkQuoteAssociated", ["dataFile", quoteAssociated]);
    function quoteAssociated(paths) {
        // Template Url
        var templateUrl = paths.templatesPath + "mk-quote-associated.html";

        function link(scope, elem, attrs) {
            var x = 2;
        }

        return {
            link: link,
            templateUrl: templateUrl,
            replace: true
        }
    }
})(angular);


(function (angular) {
    angular.module('masterkey.api').directive('mkQuoteCourse', ['dataFile', quoteCourse]);
    function quoteCourse(paths) {
        return {
            templateUrl: paths.templatesPath + 'mk-quote-course.html'
        };
    }
})(angular);


(function (angular) {
    angular.module("masterkey.api").directive("mkQuote", ["dataFile", "quoteService", "currencyService", quoteDirective]);
    function quoteDirective(paths, quoteService, currencyService) {
        // Template Url
        var templateUrl = paths.templatesPath + "mk-quote-template.html";

        // Linking directive to DOM
        function link(scope, elem, attrs) {
            // Updating user token
            paths.setAuthToken(scope.userToken);
            quoteService.setQuoteDataScope(scope, scope.courseId, scope.courseVariantId);

            scope.activeTab = 'course';

            scope.isActiveTab = function (tab) {
                return tab === scope.activeTab;
            }

            scope.refreshQuote = function (courseId, courseVariantId) {
                scope.courseId = courseId;
                scope.courseVariantId = courseVariantId;
                quoteService.setQuoteDataScope(scope, courseId, courseVariantId);
            }

            scope.refreshDraft = function (cmd, qty) {
                if (qty)
                    scope.courseLine.qty = qty;
                quoteService.refreshDraft(cmd, scope);
            }

            scope.setTab = function (tab) {
                scope.activeTab = tab;
            }
        }

        return {
            link: link,
            templateUrl: templateUrl,
            scope: {
                courseId: "=mkCourse",
                courseVariantId: "=mkCourseVariant",
                userToken: "=mkUser"
            }
        }
    }
})(angular);


(function (angular) {
    'use strict';
    angular.module("masterkey.api").directive("mkQuoteVariant", ["dataFile", quoteVariant]);
    function quoteVariant(paths) {
        // Template Url
        var templateUrl = paths.templatesPath + "mk-quote-variant.html";

        function link(scope, elem, attrs) {
            var x = 2;
        }

        return {
            link: link,
            templateUrl: templateUrl,
            replace: true,
            scope: {
                fees: "="
            }
        };
    }
})(angular);


(function(angular) {
    angular.module("masterkey.api").directive('mkSearch', ["courseService", "dataFile", searchDirective]);

    function searchDirective(courseService, paths) {
        // Template Url
        var templateUrl = paths.templatesPath + "mk-search-template.html";

        function link(scope, elem, attrs) {
            // Updating user token
            paths.setAuthToken(scope.userToken);
            scope.query = {};

            // Filtering list of courses
            scope.filterCourses = function (city, school) {
                var filter = {};
                _.forIn(scope.query, function (value, key) {
                    if (value)
                        filter[key] = value;
                });
                scope.courseList = _.filter(scope.unfilteredList, function (value, index) {
                    if (filter.school) {
                        if (filter.city)
                            return schoolFilter(value, filter) && cityFilter(value, filter);
                        return schoolFilter(value, filter);
                    }
                    if (filter.city) {
                        if (filter.country)
                            return cityFilter(value, filter) && countryFilter(value, filter);
                        return cityFilter(value, filter);
                    }
                    if (filter.country)
                        return countryFilter(value, filter);

                    return true;
                });
            }

            // Get icon class from font awesome
            scope.getIconType = function (type) {
                switch (type) {
                    case "city":
                        return "fa fa-map-marker";

                    case "country":
                        return "fa fa-flag";

                    case "school":
                        return "fa fa-university";
                }
                return "fa fa-question";
            }

            // Send the searching text
            scope.goSearch = function (place, courseType) {
                if (place && courseType) {
                    scope.messageDanger = undefined;
                    scope.unfilteredList = courseService.listByPlaceAndCourseType(place, courseType);
                    scope.unfilteredList.$promise.then(copyCourseList);
                } else {
                    scope.messageDanger = "All the controls are a must.";
                }
            };

            // Refreshing list of course types
            scope.refreshOptionslist = refreshOptionsList;

            // Copying list of course types to show on table
            function copyCourseList(response) {
                scope.courseList = _.map(scope.unfilteredList, function (item) { return item; });
                courseService.loadAndBindToCourseList(scope.courseList);
                refreshOptionsList(scope.courseList);
            }

            function cityFilter(value, filter) {
                return existingCountry(value) &&
                    value.institute.city.country.id == filter.city.country.id;
                    value.institute.city.id == filter.city.id;
            }

            function existingCountry(value) {
                return value.institute && value.institute.city && value.institute.city.country;
            }

            function countryFilter(value, filter) {
                return existingCountry(value) &&
                    value.institute.city.country.id == filter.country.id;
            }

            function schoolFilter(value, filter) {
                return value.institute && value.institute.school &&
                    value.institute.school.id == filter.school.id;
            }

            // Filtering options of filters
            function refreshOptionsList(courseList) {
                scope.options = {
                    cityList: [],
                    countryList: [],
                    schoolList: []
                };
                for (var index = 0; index < courseList.length; index++) {
                    var value = courseList[index];
                    if (value.institute) {
                        var city = value.institute.city;
                        var school = value.institute.school;
                        if (city) {
                            var country = city.country;
                            var exist = _.some(scope.options.cityList, function (item, index) {
                                return item.id && item.id == city.id && item.country && item.country.id == city.country.id;
                            });
                            if (!exist)
                                scope.options.cityList.push(city);
                            if (country) {
                                var exist = _.some(scope.options.countryList, function (item, index) {
                                    return item.id == country.id;
                                });
                                if (!exist)
                                    scope.options.countryList.push(country);
                            }
                        }
                        if (school) {
                            var exist = _.some(scope.options.schoolList, function (item, index) {
                                return item.id && item.id == school.id;
                            });
                            if (!exist)
                                scope.options.schoolList.push(school);
                        }
                    }
                }
            }
        }

        return {
            restrict: 'EA',
            link: link,
            templateUrl: templateUrl,
            scope: {
                userToken: '=mkUser'
            }
        };
    }
})(angular);

(function (angular) {
    'use strict';
    angular.module("masterkey.api").directive("mkSearchFilters", ["dataFile", searchFilters]);
    function searchFilters(paths) {
        var templateUrl = paths.templatesPath + "mk-search-filters.html";
        return {
            restrict: "EA",
            templateUrl: templateUrl,
            scope: {
                courseList: "=",
                options: "=lists",
                place: "=",
                query: "=filters",
                refresh: "&"
            }
        };
    }
})(angular);

(function (angular) {
    "use strict";
    angular.module("masterkey.api").directive("mkSearchList", ["dataFile", searchList]);
    function searchList(paths) {
        var templateUrl = paths.templatesPath + "mk-search-list.html";
        function link(scope, elem, attrs) {
            scope.imageUrl = function (uri) {
                return paths.imagesPath + uri;
            };
        }

        return {
            link: link,
            templateUrl: templateUrl,
        }
    }
})(angular);


(function (angular) {
    angular.module("masterkey.api").directive("mkSearchTopbar", ["CourseType", "courseService", "dataFile", topbarDirective]);

    function topbarDirective(courseType, courseService, paths) {
        var templateUrl = paths.templatesPath + "mk-search-topbar.html";

        function link(scope, elem, attrs) {
            // Course types are required to start
            courseType.query().then(function (courseTypeList) {
                scope.courseTypeList = courseTypeList;
            });

            scope.placeList = [];

            // Refreshing list of places by course type and searching text
            scope.refreshPlaceList = function (search, courseType) {
                // At least 1 charachter
                if (search.length < 1) {
                    scope.placeList = [];
                    return;
                }

                scope.placeList = courseService.queryByCourseType(search, courseType);
            }
        }

        return {
            link: link,
            templateUrl: templateUrl
        };
    }
})(angular);


(function (angular) {
'use strict';
    
angular.module('masterkey.api')
    .factory('BackendPagination', function () {
        
        function PaginationService(res) {
            this.size = res.meta.max;
            this.total = res.meta.totalCount;
            this.offset = res.meta.offset;
            this.count = res.resourceList.length;
            this.page = Math.ceil(this.offset / this.size) + 1;
            this.pages = Math.ceil(this.total / this.size);
        }
        
        PaginationService.prototype.getMeta = function () {
            return {
                totalCount: this.total,
                max: this.size,
                offset: this.getOffset()
            };
        };
        
        PaginationService.prototype.getOffset = function () {
            return this.size * (this.page - 1);
        };
        
        return PaginationService;
    });
})(angular);

(function (angular) {
    'use strict';

    angular.module('masterkey.api')
      .factory('Price', function () {

          /**
           * Utility class to manage prices in the app
           * @param {Float} amount   
           * @param {String} currency code
           */
          function Price(amount, currency) {
              this.amount = amount;
              this.currency = currency;
          }

          /**
           * Returns a new price with same currency and
           * and the new amount 
           * 
           * @param {Float} amount
           */
          Price.prototype.add = function (amount) {
              return new Price(this.amount + amount, this.currency);
          };

          return Price;
      })


      .factory('MultiCurrencyPrice', function () {
          /**
           * MulticurrencyPrice is a set of 
           * prices that can be exchange to generate
           * an estimated total
           * 
           * @param {Price} priceList 
           */
          function MultiCurrencyPrice(priceList, total) {

              this.priceList = priceList;
              this.total = total;

              Object.freeze(this);

          }

          return MultiCurrencyPrice;
      });
})(angular);

(function (angular) {
    angular.module("masterkey.api").factory("quoteService", ["courseService", "DraftCommand", "lineCommand", "SaleQueryCommand", "currencyService", "Price", quoteService]);
    function quoteService(courseService, DraftCommand, lineCommand, SaleQueryCommand, currencyService, Price) {
        function setQuoteDataScope(scope, courseId, courseVariantId) {
            if (!scope) return;
            var courseData = courseService.getCourse(courseId);
            var variantData = courseService.getCourseVariant(courseId, courseVariantId);
            var eventlistData = courseService.listByCourseVariant(courseVariantId);
            var promotionlistData = courseService.listOptionalPromotion(courseId);
            var addServices = _.curry(function (draftScope, data) {
                var lines = buildServiceLineCommand(data);
                scope.cmd.addAssociatedService(lines);

                return data;
            })(scope);

            var bindProduct = _.curry(function (draftScope, key, data) {
                draftScope.options[key] = { product: data };

                return data;
            })(scope);

            courseData.$promise.then(responseCourseData);
            variantData.$promise.then(responseVariantData);
            eventlistData.$promise.then(responseEventlistData);
            
            // Initialize values
            scope.course = courseData;
            scope.courseVariant = variantData;
            scope.courseEventList = eventlistData;
            scope.optionalPromotionList = promotionlistData;
            scope.draft = {};
            scope.options = [];
            scope.localCurrency = null;
            scope.saveMode = "existing";
            scope.opportunity = {};
            scope.quote = {};
            scope.cmd = {
                courseLine: {
                    event: {}
                },
                associatedServiceLine: {},
                agencyPromotionList: {}
            };
            scope.courseLine = scope.cmd.courseLine;

            function generateData(response) {
                var associateds = courseService.findAllAssociatedByCourse(scope.course.id);
                var accommodations = courseService.listAccommodationByCourse(scope.course.id);
                var providers = courseService.findAllProvidedByCourse(scope.course.id);
                associateds.$promise
                    .then(bindProduct('associatedServiceLine'))
                    .then(addServices);
                accommodations.$promise
                    .then(bindProduct('accommodationLine'));
                providers.$promise
                    .then(bindProduct('providerServiceLine'))
                    .then(addServices)
                    .then(responseProviderList);
                scope.saleQueryCommand = SaleQueryCommand.createFromState({
                    status: ['Active', 'Pending'],
                    max: 10
                });

                var query = scope.saleQueryCommand.toQueryParams();
                scope.saleList = courseService.listSales(query);
                scope.recentSalesList = scope.saleList;
            }

            function responseCourseData(response) {
                scope.cmd.course = courseData;
                // Default data for new Sales
                scope.opportunity.courseType = courseData.type;
                scope.opportunity.isClientStudent = true;
                tryUpdateOptions(scope.cmd);
            }

            function responseEventlistData(response) {
                scope.cmd.courseLine.event = eventlistData[0];
                tryUpdateOptions(scope.cmd);
            }

            function responseProviderList(response) {
                scope.providerList = buildProviderList(response);
                scope.cmd = refreshCommand(scope.cmd);
            }

            function responseVariantData(response) {
                scope.cmd.courseLine.product = variantData;
                tryUpdateOptions(scope.cmd);
            }

            function tryUpdateOptions(cmd) {
                if (courseData.$resolved && variantData.$resolved && eventlistData.$resolved) {
                    scope.options = updateOptions(scope, cmd);
                    applyLocalCurrency(scope).then(function (response) {
                        if (response)
                            response.then(generateData);
                        else
                            generateData();
                    });
                }
            }
        }

        function applyDraftToCommand(draft, cmd) {
            /**
             * Add draft information to the given line
             */
            function addDraftToLine(id, line) {

                if (!line.added) { return line }

                line.draftLine = _.find(draft.lines, function (l) {
                    return l.product.id === line.product.id && l.product.class === line.product.class;
                });

                return line;
            }

            var associatedServiceLine = _.reduce(cmd.associatedServiceLine, function (acc, line, id) {
                acc[id] = addDraftToLine(id, line);

                return acc;
            }, {});

            return angular.extend(new DraftCommand(), cmd, {
                associatedServiceLine: associatedServiceLine
            });
        }

        function applyLocalCurrency(scope) {
            return currencyService.loadExchangeCurrency().then(function (currency) {
                scope.localCurrency = currency;
                return refreshDraft(scope.cmd, scope);
            });
        }

        function buildProviderList(providerServiceList) {
            return _.reduce(providerServiceList, function (providerList, service) {
                var exists = _.some(providerList, { id: service.provider.id });
                if (exists) { return providerList }
                service.provider.$visible = true;

                return providerList.concat([service.provider]);
            }, []);
        }

        function buildServiceLineCommand(associatedServiceList) {
            return _.reduce(associatedServiceList, function (obj, srv) {
                obj[srv.id] = new lineCommand(srv);
                return obj;
            }, {});
        }

        function create(draftCommand) {
            return courseService.postCreateDraft(marshalCommand(draftCommand)).then(postProcessDraft);
        }

        function createCourseLineOptions(course, courseVariant, courseEvent, courseEventList) {
            var durations = [];
            if (courseEvent && courseEvent.duration && courseVariant && courseVariant.currentBasePrice) {
                durations = [
                  _.range(courseEvent.duration.min, courseEvent.duration.max + 1),
                  _.range(courseVariant.duration.min, courseVariant.duration.max + 1),

                  // Add currentBasePrice supported qty
                  courseVariant.currentBasePrice.supportedQty
                ];
            }

            return {
                product: _.filter(course.variant, function (v) {
                    return v.id !== courseVariant.id;
                }),
                event: courseEventList,

                // Calculate in service
                qty: _.intersection(durations[0], durations[1], durations[2])
            };
        }

        /**
         * Add lines with localPrice using the currency given
         * 
         * @param  {Array<DraftLine>} lines 
         * @return {Array<Price>}      
         */
        function exchange(draft, currency) {
            var priceList = groupByCurrency(draft.lines),

            rates = _.map(priceList, function (p) {
                var unit = currencyService.convert(1, p.currency, currency.rates);
                return new Price(unit, p.currency);
            }),

            localTotal = _.reduce(priceList, function (sum, l) {

                var local = currencyService.convert(l.amount, l.currency, currency.rates);

                return sum.add(local);

            }, new Price(0.0, currency.currency)),


            lines = _.map(draft.lines, function (l) {
                return angular.extend({}, l, {
                    localTotal: new Price(
                      currencyService.convert(l.total, l.currency, currency.rates),
                      currency.currency
                    )
                });
            });


            return angular.extend({}, draft, {
                lines: lines,
                localTotal: localTotal,
                total: {
                    byCurrency: priceList,
                    local: localTotal,
                    rates: rates
                }
            });
        }

        /**
         * Find all lines with the given type
         *
         * @param {Array<Lines>} lines, draft line
         * @param {String}  type 
         */
        function findLines(lines, type) {

            var types = {
                course: 'CourseVariant',
                accommodation: 'Accommodation',
                instituteService: 'InstituteServicee',
                providerService: 'ProviderServicee'
            };

            return _.filter(lines, function (l) {
                return l.type === types[type];
            });
        }

        /**
         * Given a alist of prices, all prices areg
         * @param  {[type]} lines [description]
         * @return {[type]}       [description]
         */
        function groupByCurrency(lines) {
            var currencyMap = _.groupBy(lines, 'currency');

            return _.map(Object.keys(currencyMap), function (c) {

                var total = _.reduce(currencyMap[c], function (sum, l) {
                    return sum + l.total;
                }, 0);

                return new Price(total, c);
            });
        }

        function mapAndFilterLines(lines) {

            lines = lines || {};

            var linesArray = _.map(Object.keys(lines), function (k) { return lines[k] });

            return _.filter(linesArray, { added: true });
        }

        function marshalCommand(draftCommand) {
            function id(property) {
                return property ? property.id : undefined;
            }

            return {
                client: id(draftCommand.client),
                course: id(draftCommand.course),
                courseLine: marshalLine(draftCommand.courseLine),
                accommodationLine: marshalLine(draftCommand.accommodationLine),

                // Map lservice lines
                associatedServiceLine: _.map(
                  mapAndFilterLines(draftCommand.associatedServiceLine),
                  marshalLine
                ),

                agencyPromotionList: _.map(draftCommand.agencyPromotionList, id)
            };
        }

        function marshalLine(line) {

            function same(property) { return property }
            function date(property) {
                if (property) {
                    var date = new Date(property);
                    return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
                }
            }
            function id(property) { return property ? property.id : null }
            function optional(property) { return property ? property : undefined }

            function applyMarshaller(callback, value) {
                var callbackList = angular.isArray(callback) ? callback : [callback];

                return _.reduce(callbackList, function (result, fn) {
                    return fn(result);
                }, value);
            }

            var properties = {
                qty: same,
                startDate: date,
                endDate: date,
                product: id,
                event: [id, optional]
            };

            if (line) {
                return _.reduce(Object.keys(properties), function (out, p) {
                    out[p] = applyMarshaller(properties[p], line[p]);

                    return out;
                }, {});
            }
        }

        function postProcessDraft(response) {
            var draft = response.data;
            return angular.extend({}, draft, {
                // Notes are grouped by noteType to allow showing notes in different locations
                notesByType: _.groupBy(draft.notes, 'noteType'),
                lines: _.map(draft.lines, sortItems),
                courseLine: findLines(draft.lines, 'course')[0],
                accommodationLine: findLines(draft.lines, 'accommodation')[0],
                instituteServiceLines: findLines(draft.lines, 'instituteService'),
                providerServiceLines: findLines(draft.lines, 'providerService')
            });
        }

        function refreshCommand(draftCommand, options) {
            return angular.extend(new DraftCommand(), draftCommand, {
                courseLine: updateCourseLine(draftCommand.courseLine, options),
                accommodationLine: updateAccommodationLine(draftCommand)
            });
        }

        function refreshDraft(cmd, scope) {
            scope.cmd = refreshCommand(cmd, scope.options);
            scope.options = updateOptions(scope, scope.cmd, scope.options);

            // Aquí falta insertar el objeto scope.cmd
            return create(scope.cmd).then(function (draft) {
                scope.draft = exchange(draft, scope.localCurrency);
                scope.cmd = applyDraftToCommand(draft, scope.cmd);
            });
        }

        /**
         * Return a new line with sorted items
         * Items are sorted by type and category
         * Useful to allow items flashing after draft refresh
         * 
         * @param  {Lines} lines 
         * @return {Lines}       
         */
        function sortItems(line) {
            var types = {
                BasePrice: 0,
                Fee: 1
            },

            categories = {
                TuitionFee: 0,
                AccommodationFee: 0,
                SearchLodgingFee: 1,
                InscriptionFee: 1,
                CustomFee: 2
            };


            function getIndex(item) {
                var
                type = types[item.type] || 10,
                category = categories[item.category] || 10;

                return type + category;
            }

            return angular.extend({}, line, {
                items: line.items.sort(function (a, b) {
                    return getIndex(b) - getIndex(a);
                })
            });
        }

        function updateCourseLine(courseLine, options) {
            if (options && options.courseLine && options.courseLine.qty)
                courseLine.qty = courseLine.qty || options.courseLine.qty[0];
            return courseLine;
        }

        function updateAccommodationLine(draftCommand) {
            var line = draftCommand.accommodationLine;

            if (line && line.product) {
                return angular.extend({}, line, {
                    qty: line.qty || draftCommand.courseLine.qty,
                    startDate: line.startDate || draftCommand.courseLine.event.start
                });
            }
        }

        function updateOptions(scope, cmd, options) {
            function getOption(key) {
                var defaultVal = { product: null };

                if (!options) { return defaultVal; }

                return options[key].product ? options[key] : defaultVal;
            }

            return {
                courseLine: createCourseLineOptions(
                    scope.course,
                    scope.courseVariant,
                    cmd.courseLine.event,
                    scope.courseEventList
                ),
                accommodationLine: getOption('accommodationLine'),
                associatedServiceLine: getOption('associatedServiceLine'),
                providerServiceLine: getOption('providerServiceLine')
            };
        }

        return {
            applyDraftToCommand: applyDraftToCommand,
            create: create,
            exchange: exchange,
            refreshCommand: refreshCommand,
            refreshDraft: refreshDraft,
            setQuoteDataScope: setQuoteDataScope,
            updateOptions: updateOptions
        };
    }
})(angular);


(function(angular){ 'use strict';

var app = angular.module('masterkey.api');

/**
 * QueryCommadn to filter payments
 */
app.factory('SaleQueryCommand', function(converterService, commandGenerator){

  var allowedStatus = ['All', 'Pending', 'Active', 'Approved'];
  //var defaultStatus = 'All';
  var f = converterService.getDefaultFilters();

  /**
   * Commadn to generate queries
   * @param {String} type   
   * @param {Object} params 
   */
  function SaleQueryCommand(params, page){
    // Default status is pending
    angular.extend(this, params);
    this.page = page;
    // this.status = allowedStatus.indexOf(this.status) ? this.status : defaultStatus;
  }

  /**
   * Default pageSize
   */
  SaleQueryCommand.pageSize = 25;

  function withArray(it){
    return angular.isArray(it) ? it : [it];
  }

  return commandGenerator.addQueryMethods(SaleQueryCommand, {
    fromState: {
      q: f.eq,
      client: f.wrap('id'),
      distributor: f.wrap('id'),
      status: function(it){
        var array = withArray(it);
        return _.filter(array, function(st){
          return allowedStatus.indexOf(st) !== -1;
        });
      },
      interestLevel: f.eq,
      paymentStatus: f.eq,
      enrollmentStatus: f.eq
    },

    toState: {
      q: f.eq,
      client: f.id,
      distributor: f.id,
      status: f.eq,
      interestLevel: withArray,
      paymentStatus: f.eq,
      enrollmentStatus: f.eq
    },

    fromQuery: {
      q: f.eq,
      client: f.eq,

      // Work only with single distributor
      distributor: function(it){ return it ? it[0] : null },
      
      // Take first value of status. ['Pending'] => 'Pending'
      status: f.eq,
      interestLevel: f.eq,
      paymentStatus: f.eq,
      enrollmentStatus: f.eq
    },

    toQuery: {
      q: f.eq,
      client: f.id,
      distributor: f.id,
      
      status: function(it){
        var filter = f.map({
          All: '',
          Pending: 'Pending',
          Active: 'Active',
          Approved: 'Approved'
        });

        return _.map(it, filter);
      },

      interestLevel: f.eq,
      paymentStatus: f.eq,
      enrollmentStatus: f.eq
    }
  });

});

})(angular);
/*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 2.1.3 - 2016-08-25
 * License: MIT
 */angular.module("ui.bootstrap", ["ui.bootstrap.tpls","ui.bootstrap.datepickerPopup","ui.bootstrap.datepicker","ui.bootstrap.dateparser","ui.bootstrap.isClass","ui.bootstrap.position"]);
angular.module("ui.bootstrap.tpls", ["uib/template/datepickerPopup/popup.html","uib/template/datepicker/datepicker.html","uib/template/datepicker/day.html","uib/template/datepicker/month.html","uib/template/datepicker/year.html"]);
angular.module('ui.bootstrap.datepickerPopup', ['ui.bootstrap.datepicker', 'ui.bootstrap.position'])

.value('$datepickerPopupLiteralWarning', true)

.constant('uibDatepickerPopupConfig', {
  altInputFormats: [],
  appendToBody: false,
  clearText: 'Clear',
  closeOnDateSelection: true,
  closeText: 'Done',
  currentText: 'Today',
  datepickerPopup: 'yyyy-MM-dd',
  datepickerPopupTemplateUrl: 'uib/template/datepickerPopup/popup.html',
  datepickerTemplateUrl: 'uib/template/datepicker/datepicker.html',
  html5Types: {
    date: 'yyyy-MM-dd',
    'datetime-local': 'yyyy-MM-ddTHH:mm:ss.sss',
    'month': 'yyyy-MM'
  },
  onOpenFocus: true,
  showButtonBar: true,
  placement: 'auto bottom-left'
})

.controller('UibDatepickerPopupController', ['$scope', '$element', '$attrs', '$compile', '$log', '$parse', '$window', '$document', '$rootScope', '$uibPosition', 'dateFilter', 'uibDateParser', 'uibDatepickerPopupConfig', '$timeout', 'uibDatepickerConfig', '$datepickerPopupLiteralWarning',
function($scope, $element, $attrs, $compile, $log, $parse, $window, $document, $rootScope, $position, dateFilter, dateParser, datepickerPopupConfig, $timeout, datepickerConfig, $datepickerPopupLiteralWarning) {
  var cache = {},
    isHtml5DateInput = false;
  var dateFormat, closeOnDateSelection, appendToBody, onOpenFocus,
    datepickerPopupTemplateUrl, datepickerTemplateUrl, popupEl, datepickerEl, scrollParentEl,
    ngModel, ngModelOptions, $popup, altInputFormats, watchListeners = [];

  this.init = function(_ngModel_) {
    ngModel = _ngModel_;
    ngModelOptions = angular.isObject(_ngModel_.$options) ?
      _ngModel_.$options :
      {
        timezone: null
      };
    closeOnDateSelection = angular.isDefined($attrs.closeOnDateSelection) ?
      $scope.$parent.$eval($attrs.closeOnDateSelection) :
      datepickerPopupConfig.closeOnDateSelection;
    appendToBody = angular.isDefined($attrs.datepickerAppendToBody) ?
      $scope.$parent.$eval($attrs.datepickerAppendToBody) :
      datepickerPopupConfig.appendToBody;
    onOpenFocus = angular.isDefined($attrs.onOpenFocus) ?
      $scope.$parent.$eval($attrs.onOpenFocus) : datepickerPopupConfig.onOpenFocus;
    datepickerPopupTemplateUrl = angular.isDefined($attrs.datepickerPopupTemplateUrl) ?
      $attrs.datepickerPopupTemplateUrl :
      datepickerPopupConfig.datepickerPopupTemplateUrl;
    datepickerTemplateUrl = angular.isDefined($attrs.datepickerTemplateUrl) ?
      $attrs.datepickerTemplateUrl : datepickerPopupConfig.datepickerTemplateUrl;
    altInputFormats = angular.isDefined($attrs.altInputFormats) ?
      $scope.$parent.$eval($attrs.altInputFormats) :
      datepickerPopupConfig.altInputFormats;

    $scope.showButtonBar = angular.isDefined($attrs.showButtonBar) ?
      $scope.$parent.$eval($attrs.showButtonBar) :
      datepickerPopupConfig.showButtonBar;

    if (datepickerPopupConfig.html5Types[$attrs.type]) {
      dateFormat = datepickerPopupConfig.html5Types[$attrs.type];
      isHtml5DateInput = true;
    } else {
      dateFormat = $attrs.uibDatepickerPopup || datepickerPopupConfig.datepickerPopup;
      $attrs.$observe('uibDatepickerPopup', function(value, oldValue) {
        var newDateFormat = value || datepickerPopupConfig.datepickerPopup;
        // Invalidate the $modelValue to ensure that formatters re-run
        // FIXME: Refactor when PR is merged: https://github.com/angular/angular.js/pull/10764
        if (newDateFormat !== dateFormat) {
          dateFormat = newDateFormat;
          ngModel.$modelValue = null;

          if (!dateFormat) {
            throw new Error('uibDatepickerPopup must have a date format specified.');
          }
        }
      });
    }

    if (!dateFormat) {
      throw new Error('uibDatepickerPopup must have a date format specified.');
    }

    if (isHtml5DateInput && $attrs.uibDatepickerPopup) {
      throw new Error('HTML5 date input types do not support custom formats.');
    }

    // popup element used to display calendar
    popupEl = angular.element('<div uib-datepicker-popup-wrap><div uib-datepicker></div></div>');

    popupEl.attr({
      'ng-model': 'date',
      'ng-change': 'dateSelection(date)',
      'template-url': datepickerPopupTemplateUrl
    });

    // datepicker element
    datepickerEl = angular.element(popupEl.children()[0]);
    datepickerEl.attr('template-url', datepickerTemplateUrl);

    if (!$scope.datepickerOptions) {
      $scope.datepickerOptions = {};
    }

    if (isHtml5DateInput) {
      if ($attrs.type === 'month') {
        $scope.datepickerOptions.datepickerMode = 'month';
        $scope.datepickerOptions.minMode = 'month';
      }
    }

    datepickerEl.attr('datepicker-options', 'datepickerOptions');

    if (!isHtml5DateInput) {
      // Internal API to maintain the correct ng-invalid-[key] class
      ngModel.$$parserName = 'date';
      ngModel.$validators.date = validator;
      ngModel.$parsers.unshift(parseDate);
      ngModel.$formatters.push(function(value) {
        if (ngModel.$isEmpty(value)) {
          $scope.date = value;
          return value;
        }

        if (angular.isNumber(value)) {
          value = new Date(value);
        }

        $scope.date = dateParser.fromTimezone(value, ngModelOptions.timezone);

        return dateParser.filter($scope.date, dateFormat);
      });
    } else {
      ngModel.$formatters.push(function(value) {
        $scope.date = dateParser.fromTimezone(value, ngModelOptions.timezone);
        return value;
      });
    }

    // Detect changes in the view from the text box
    ngModel.$viewChangeListeners.push(function() {
      $scope.date = parseDateString(ngModel.$viewValue);
    });

    $element.on('keydown', inputKeydownBind);

    $popup = $compile(popupEl)($scope);
    // Prevent jQuery cache memory leak (template is now redundant after linking)
    popupEl.remove();

    if (appendToBody) {
      $document.find('body').append($popup);
    } else {
      $element.after($popup);
    }

    $scope.$on('$destroy', function() {
      if ($scope.isOpen === true) {
        if (!$rootScope.$$phase) {
          $scope.$apply(function() {
            $scope.isOpen = false;
          });
        }
      }

      $popup.remove();
      $element.off('keydown', inputKeydownBind);
      $document.off('click', documentClickBind);
      if (scrollParentEl) {
        scrollParentEl.off('scroll', positionPopup);
      }
      angular.element($window).off('resize', positionPopup);

      //Clear all watch listeners on destroy
      while (watchListeners.length) {
        watchListeners.shift()();
      }
    });
  };

  $scope.getText = function(key) {
    return $scope[key + 'Text'] || datepickerPopupConfig[key + 'Text'];
  };

  $scope.isDisabled = function(date) {
    if (date === 'today') {
      date = dateParser.fromTimezone(new Date(), ngModelOptions.timezone);
    }

    var dates = {};
    angular.forEach(['minDate', 'maxDate'], function(key) {
      if (!$scope.datepickerOptions[key]) {
        dates[key] = null;
      } else if (angular.isDate($scope.datepickerOptions[key])) {
        dates[key] = new Date($scope.datepickerOptions[key]);
      } else {
        if ($datepickerPopupLiteralWarning) {
          $log.warn('Literal date support has been deprecated, please switch to date object usage');
        }

        dates[key] = new Date(dateFilter($scope.datepickerOptions[key], 'medium'));
      }
    });

    return $scope.datepickerOptions &&
      dates.minDate && $scope.compare(date, dates.minDate) < 0 ||
      dates.maxDate && $scope.compare(date, dates.maxDate) > 0;
  };

  $scope.compare = function(date1, date2) {
    return new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()) - new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  };

  // Inner change
  $scope.dateSelection = function(dt) {
    $scope.date = dt;
    var date = $scope.date ? dateParser.filter($scope.date, dateFormat) : null; // Setting to NULL is necessary for form validators to function
    $element.val(date);
    ngModel.$setViewValue(date);

    if (closeOnDateSelection) {
      $scope.isOpen = false;
      $element[0].focus();
    }
  };

  $scope.keydown = function(evt) {
    if (evt.which === 27) {
      evt.stopPropagation();
      $scope.isOpen = false;
      $element[0].focus();
    }
  };

  $scope.select = function(date, evt) {
    evt.stopPropagation();

    if (date === 'today') {
      var today = new Date();
      if (angular.isDate($scope.date)) {
        date = new Date($scope.date);
        date.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
      } else {
        date = dateParser.fromTimezone(today, ngModelOptions.timezone);
        date.setHours(0, 0, 0, 0);
      }
    }
    $scope.dateSelection(date);
  };

  $scope.close = function(evt) {
    evt.stopPropagation();

    $scope.isOpen = false;
    $element[0].focus();
  };

  $scope.disabled = angular.isDefined($attrs.disabled) || false;
  if ($attrs.ngDisabled) {
    watchListeners.push($scope.$parent.$watch($parse($attrs.ngDisabled), function(disabled) {
      $scope.disabled = disabled;
    }));
  }

  $scope.$watch('isOpen', function(value) {
    if (value) {
      if (!$scope.disabled) {
        $timeout(function() {
          positionPopup();

          if (onOpenFocus) {
            $scope.$broadcast('uib:datepicker.focus');
          }

          $document.on('click', documentClickBind);

          var placement = $attrs.popupPlacement ? $attrs.popupPlacement : datepickerPopupConfig.placement;
          if (appendToBody || $position.parsePlacement(placement)[2]) {
            scrollParentEl = scrollParentEl || angular.element($position.scrollParent($element));
            if (scrollParentEl) {
              scrollParentEl.on('scroll', positionPopup);
            }
          } else {
            scrollParentEl = null;
          }

          angular.element($window).on('resize', positionPopup);
        }, 0, false);
      } else {
        $scope.isOpen = false;
      }
    } else {
      $document.off('click', documentClickBind);
      if (scrollParentEl) {
        scrollParentEl.off('scroll', positionPopup);
      }
      angular.element($window).off('resize', positionPopup);
    }
  });

  function cameltoDash(string) {
    return string.replace(/([A-Z])/g, function($1) { return '-' + $1.toLowerCase(); });
  }

  function parseDateString(viewValue) {
    var date = dateParser.parse(viewValue, dateFormat, $scope.date);
    if (isNaN(date)) {
      for (var i = 0; i < altInputFormats.length; i++) {
        date = dateParser.parse(viewValue, altInputFormats[i], $scope.date);
        if (!isNaN(date)) {
          return date;
        }
      }
    }
    return date;
  }

  function parseDate(viewValue) {
    if (angular.isNumber(viewValue)) {
      // presumably timestamp to date object
      viewValue = new Date(viewValue);
    }

    if (!viewValue) {
      return null;
    }

    if (angular.isDate(viewValue) && !isNaN(viewValue)) {
      return viewValue;
    }

    if (angular.isString(viewValue)) {
      var date = parseDateString(viewValue);
      if (!isNaN(date)) {
        return dateParser.fromTimezone(date, ngModelOptions.timezone);
      }
    }

    return ngModel.$options && ngModel.$options.allowInvalid ? viewValue : undefined;
  }

  function validator(modelValue, viewValue) {
    var value = modelValue || viewValue;

    if (!$attrs.ngRequired && !value) {
      return true;
    }

    if (angular.isNumber(value)) {
      value = new Date(value);
    }

    if (!value) {
      return true;
    }

    if (angular.isDate(value) && !isNaN(value)) {
      return true;
    }

    if (angular.isString(value)) {
      return !isNaN(parseDateString(value));
    }

    return false;
  }

  function documentClickBind(event) {
    if (!$scope.isOpen && $scope.disabled) {
      return;
    }

    var popup = $popup[0];
    var dpContainsTarget = $element[0].contains(event.target);
    // The popup node may not be an element node
    // In some browsers (IE) only element nodes have the 'contains' function
    var popupContainsTarget = popup.contains !== undefined && popup.contains(event.target);
    if ($scope.isOpen && !(dpContainsTarget || popupContainsTarget)) {
      $scope.$apply(function() {
        $scope.isOpen = false;
      });
    }
  }

  function inputKeydownBind(evt) {
    if (evt.which === 27 && $scope.isOpen) {
      evt.preventDefault();
      evt.stopPropagation();
      $scope.$apply(function() {
        $scope.isOpen = false;
      });
      $element[0].focus();
    } else if (evt.which === 40 && !$scope.isOpen) {
      evt.preventDefault();
      evt.stopPropagation();
      $scope.$apply(function() {
        $scope.isOpen = true;
      });
    }
  }

  function positionPopup() {
    if ($scope.isOpen) {
      var dpElement = angular.element($popup[0].querySelector('.uib-datepicker-popup'));
      var placement = $attrs.popupPlacement ? $attrs.popupPlacement : datepickerPopupConfig.placement;
      var position = $position.positionElements($element, dpElement, placement, appendToBody);
      dpElement.css({top: position.top + 'px', left: position.left + 'px'});
      if (dpElement.hasClass('uib-position-measure')) {
        dpElement.removeClass('uib-position-measure');
      }
    }
  }

  $scope.$on('uib:datepicker.mode', function() {
    $timeout(positionPopup, 0, false);
  });
}])

.directive('uibDatepickerPopup', function() {
  return {
    require: ['ngModel', 'uibDatepickerPopup'],
    controller: 'UibDatepickerPopupController',
    scope: {
      datepickerOptions: '=?',
      isOpen: '=?',
      currentText: '@',
      clearText: '@',
      closeText: '@'
    },
    link: function(scope, element, attrs, ctrls) {
      var ngModel = ctrls[0],
        ctrl = ctrls[1];

      ctrl.init(ngModel);
    }
  };
})

.directive('uibDatepickerPopupWrap', function() {
  return {
    restrict: 'A',
    transclude: true,
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/datepickerPopup/popup.html';
    }
  };
});

angular.module('ui.bootstrap.datepicker', ['ui.bootstrap.dateparser', 'ui.bootstrap.isClass'])

.value('$datepickerSuppressError', false)

.value('$datepickerLiteralWarning', true)

.constant('uibDatepickerConfig', {
  datepickerMode: 'day',
  formatDay: 'dd',
  formatMonth: 'MMMM',
  formatYear: 'yyyy',
  formatDayHeader: 'EEE',
  formatDayTitle: 'MMMM yyyy',
  formatMonthTitle: 'yyyy',
  maxDate: null,
  maxMode: 'year',
  minDate: null,
  minMode: 'day',
  monthColumns: 3,
  ngModelOptions: {},
  shortcutPropagation: false,
  showWeeks: true,
  yearColumns: 5,
  yearRows: 4
})

.controller('UibDatepickerController', ['$scope', '$element', '$attrs', '$parse', '$interpolate', '$locale', '$log', 'dateFilter', 'uibDatepickerConfig', '$datepickerLiteralWarning', '$datepickerSuppressError', 'uibDateParser',
  function($scope, $element, $attrs, $parse, $interpolate, $locale, $log, dateFilter, datepickerConfig, $datepickerLiteralWarning, $datepickerSuppressError, dateParser) {
  var self = this,
      ngModelCtrl = { $setViewValue: angular.noop }, // nullModelCtrl;
      ngModelOptions = {},
      watchListeners = [];

  $element.addClass('uib-datepicker');
  $attrs.$set('role', 'application');

  if (!$scope.datepickerOptions) {
    $scope.datepickerOptions = {};
  }

  // Modes chain
  this.modes = ['day', 'month', 'year'];

  [
    'customClass',
    'dateDisabled',
    'datepickerMode',
    'formatDay',
    'formatDayHeader',
    'formatDayTitle',
    'formatMonth',
    'formatMonthTitle',
    'formatYear',
    'maxDate',
    'maxMode',
    'minDate',
    'minMode',
    'monthColumns',
    'showWeeks',
    'shortcutPropagation',
    'startingDay',
    'yearColumns',
    'yearRows'
  ].forEach(function(key) {
    switch (key) {
      case 'customClass':
      case 'dateDisabled':
        $scope[key] = $scope.datepickerOptions[key] || angular.noop;
        break;
      case 'datepickerMode':
        $scope.datepickerMode = angular.isDefined($scope.datepickerOptions.datepickerMode) ?
          $scope.datepickerOptions.datepickerMode : datepickerConfig.datepickerMode;
        break;
      case 'formatDay':
      case 'formatDayHeader':
      case 'formatDayTitle':
      case 'formatMonth':
      case 'formatMonthTitle':
      case 'formatYear':
        self[key] = angular.isDefined($scope.datepickerOptions[key]) ?
          $interpolate($scope.datepickerOptions[key])($scope.$parent) :
          datepickerConfig[key];
        break;
      case 'monthColumns':
      case 'showWeeks':
      case 'shortcutPropagation':
      case 'yearColumns':
      case 'yearRows':
        self[key] = angular.isDefined($scope.datepickerOptions[key]) ?
          $scope.datepickerOptions[key] : datepickerConfig[key];
        break;
      case 'startingDay':
        if (angular.isDefined($scope.datepickerOptions.startingDay)) {
          self.startingDay = $scope.datepickerOptions.startingDay;
        } else if (angular.isNumber(datepickerConfig.startingDay)) {
          self.startingDay = datepickerConfig.startingDay;
        } else {
          self.startingDay = ($locale.DATETIME_FORMATS.FIRSTDAYOFWEEK + 8) % 7;
        }

        break;
      case 'maxDate':
      case 'minDate':
        $scope.$watch('datepickerOptions.' + key, function(value) {
          if (value) {
            if (angular.isDate(value)) {
              self[key] = dateParser.fromTimezone(new Date(value), ngModelOptions.timezone);
            } else {
              if ($datepickerLiteralWarning) {
                $log.warn('Literal date support has been deprecated, please switch to date object usage');
              }

              self[key] = new Date(dateFilter(value, 'medium'));
            }
          } else {
            self[key] = datepickerConfig[key] ?
              dateParser.fromTimezone(new Date(datepickerConfig[key]), ngModelOptions.timezone) :
              null;
          }

          self.refreshView();
        });

        break;
      case 'maxMode':
      case 'minMode':
        if ($scope.datepickerOptions[key]) {
          $scope.$watch(function() { return $scope.datepickerOptions[key]; }, function(value) {
            self[key] = $scope[key] = angular.isDefined(value) ? value : $scope.datepickerOptions[key];
            if (key === 'minMode' && self.modes.indexOf($scope.datepickerOptions.datepickerMode) < self.modes.indexOf(self[key]) ||
              key === 'maxMode' && self.modes.indexOf($scope.datepickerOptions.datepickerMode) > self.modes.indexOf(self[key])) {
              $scope.datepickerMode = self[key];
              $scope.datepickerOptions.datepickerMode = self[key];
            }
          });
        } else {
          self[key] = $scope[key] = datepickerConfig[key] || null;
        }

        break;
    }
  });

  $scope.uniqueId = 'datepicker-' + $scope.$id + '-' + Math.floor(Math.random() * 10000);

  $scope.disabled = angular.isDefined($attrs.disabled) || false;
  if (angular.isDefined($attrs.ngDisabled)) {
    watchListeners.push($scope.$parent.$watch($attrs.ngDisabled, function(disabled) {
      $scope.disabled = disabled;
      self.refreshView();
    }));
  }

  $scope.isActive = function(dateObject) {
    if (self.compare(dateObject.date, self.activeDate) === 0) {
      $scope.activeDateId = dateObject.uid;
      return true;
    }
    return false;
  };

  this.init = function(ngModelCtrl_) {
    ngModelCtrl = ngModelCtrl_;
    ngModelOptions = ngModelCtrl_.$options ||
      $scope.datepickerOptions.ngModelOptions ||
      datepickerConfig.ngModelOptions;
    if ($scope.datepickerOptions.initDate) {
      self.activeDate = dateParser.fromTimezone($scope.datepickerOptions.initDate, ngModelOptions.timezone) || new Date();
      $scope.$watch('datepickerOptions.initDate', function(initDate) {
        if (initDate && (ngModelCtrl.$isEmpty(ngModelCtrl.$modelValue) || ngModelCtrl.$invalid)) {
          self.activeDate = dateParser.fromTimezone(initDate, ngModelOptions.timezone);
          self.refreshView();
        }
      });
    } else {
      self.activeDate = new Date();
    }

    var date = ngModelCtrl.$modelValue ? new Date(ngModelCtrl.$modelValue) : new Date();
    this.activeDate = !isNaN(date) ?
      dateParser.fromTimezone(date, ngModelOptions.timezone) :
      dateParser.fromTimezone(new Date(), ngModelOptions.timezone);

    ngModelCtrl.$render = function() {
      self.render();
    };
  };

  this.render = function() {
    if (ngModelCtrl.$viewValue) {
      var date = new Date(ngModelCtrl.$viewValue),
          isValid = !isNaN(date);

      if (isValid) {
        this.activeDate = dateParser.fromTimezone(date, ngModelOptions.timezone);
      } else if (!$datepickerSuppressError) {
        $log.error('Datepicker directive: "ng-model" value must be a Date object');
      }
    }
    this.refreshView();
  };

  this.refreshView = function() {
    if (this.element) {
      $scope.selectedDt = null;
      this._refreshView();
      if ($scope.activeDt) {
        $scope.activeDateId = $scope.activeDt.uid;
      }

      var date = ngModelCtrl.$viewValue ? new Date(ngModelCtrl.$viewValue) : null;
      date = dateParser.fromTimezone(date, ngModelOptions.timezone);
      ngModelCtrl.$setValidity('dateDisabled', !date ||
        this.element && !this.isDisabled(date));
    }
  };

  this.createDateObject = function(date, format) {
    var model = ngModelCtrl.$viewValue ? new Date(ngModelCtrl.$viewValue) : null;
    model = dateParser.fromTimezone(model, ngModelOptions.timezone);
    var today = new Date();
    today = dateParser.fromTimezone(today, ngModelOptions.timezone);
    var time = this.compare(date, today);
    var dt = {
      date: date,
      label: dateParser.filter(date, format),
      selected: model && this.compare(date, model) === 0,
      disabled: this.isDisabled(date),
      past: time < 0,
      current: time === 0,
      future: time > 0,
      customClass: this.customClass(date) || null
    };

    if (model && this.compare(date, model) === 0) {
      $scope.selectedDt = dt;
    }

    if (self.activeDate && this.compare(dt.date, self.activeDate) === 0) {
      $scope.activeDt = dt;
    }

    return dt;
  };

  this.isDisabled = function(date) {
    return $scope.disabled ||
      this.minDate && this.compare(date, this.minDate) < 0 ||
      this.maxDate && this.compare(date, this.maxDate) > 0 ||
      $scope.dateDisabled && $scope.dateDisabled({date: date, mode: $scope.datepickerMode});
  };

  this.customClass = function(date) {
    return $scope.customClass({date: date, mode: $scope.datepickerMode});
  };

  // Split array into smaller arrays
  this.split = function(arr, size) {
    var arrays = [];
    while (arr.length > 0) {
      arrays.push(arr.splice(0, size));
    }
    return arrays;
  };

  $scope.select = function(date) {
    if ($scope.datepickerMode === self.minMode) {
      var dt = ngModelCtrl.$viewValue ? dateParser.fromTimezone(new Date(ngModelCtrl.$viewValue), ngModelOptions.timezone) : new Date(0, 0, 0, 0, 0, 0, 0);
      dt.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      dt = dateParser.toTimezone(dt, ngModelOptions.timezone);
      ngModelCtrl.$setViewValue(dt);
      ngModelCtrl.$render();
    } else {
      self.activeDate = date;
      setMode(self.modes[self.modes.indexOf($scope.datepickerMode) - 1]);

      $scope.$emit('uib:datepicker.mode');
    }

    $scope.$broadcast('uib:datepicker.focus');
  };

  $scope.move = function(direction) {
    var year = self.activeDate.getFullYear() + direction * (self.step.years || 0),
        month = self.activeDate.getMonth() + direction * (self.step.months || 0);
    self.activeDate.setFullYear(year, month, 1);
    self.refreshView();
  };

  $scope.toggleMode = function(direction) {
    direction = direction || 1;

    if ($scope.datepickerMode === self.maxMode && direction === 1 ||
      $scope.datepickerMode === self.minMode && direction === -1) {
      return;
    }

    setMode(self.modes[self.modes.indexOf($scope.datepickerMode) + direction]);

    $scope.$emit('uib:datepicker.mode');
  };

  // Key event mapper
  $scope.keys = { 13: 'enter', 32: 'space', 33: 'pageup', 34: 'pagedown', 35: 'end', 36: 'home', 37: 'left', 38: 'up', 39: 'right', 40: 'down' };

  var focusElement = function() {
    self.element[0].focus();
  };

  // Listen for focus requests from popup directive
  $scope.$on('uib:datepicker.focus', focusElement);

  $scope.keydown = function(evt) {
    var key = $scope.keys[evt.which];

    if (!key || evt.shiftKey || evt.altKey || $scope.disabled) {
      return;
    }

    evt.preventDefault();
    if (!self.shortcutPropagation) {
      evt.stopPropagation();
    }

    if (key === 'enter' || key === 'space') {
      if (self.isDisabled(self.activeDate)) {
        return; // do nothing
      }
      $scope.select(self.activeDate);
    } else if (evt.ctrlKey && (key === 'up' || key === 'down')) {
      $scope.toggleMode(key === 'up' ? 1 : -1);
    } else {
      self.handleKeyDown(key, evt);
      self.refreshView();
    }
  };

  $element.on('keydown', function(evt) {
    $scope.$apply(function() {
      $scope.keydown(evt);
    });
  });

  $scope.$on('$destroy', function() {
    //Clear all watch listeners on destroy
    while (watchListeners.length) {
      watchListeners.shift()();
    }
  });

  function setMode(mode) {
    $scope.datepickerMode = mode;
    $scope.datepickerOptions.datepickerMode = mode;
  }
}])

.controller('UibDaypickerController', ['$scope', '$element', 'dateFilter', function(scope, $element, dateFilter) {
  var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  this.step = { months: 1 };
  this.element = $element;
  function getDaysInMonth(year, month) {
    return month === 1 && year % 4 === 0 &&
      (year % 100 !== 0 || year % 400 === 0) ? 29 : DAYS_IN_MONTH[month];
  }

  this.init = function(ctrl) {
    angular.extend(ctrl, this);
    scope.showWeeks = ctrl.showWeeks;
    ctrl.refreshView();
  };

  this.getDates = function(startDate, n) {
    var dates = new Array(n), current = new Date(startDate), i = 0, date;
    while (i < n) {
      date = new Date(current);
      dates[i++] = date;
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  this._refreshView = function() {
    var year = this.activeDate.getFullYear(),
      month = this.activeDate.getMonth(),
      firstDayOfMonth = new Date(this.activeDate);

    firstDayOfMonth.setFullYear(year, month, 1);

    var difference = this.startingDay - firstDayOfMonth.getDay(),
      numDisplayedFromPreviousMonth = difference > 0 ?
        7 - difference : - difference,
      firstDate = new Date(firstDayOfMonth);

    if (numDisplayedFromPreviousMonth > 0) {
      firstDate.setDate(-numDisplayedFromPreviousMonth + 1);
    }

    // 42 is the number of days on a six-week calendar
    var days = this.getDates(firstDate, 42);
    for (var i = 0; i < 42; i ++) {
      days[i] = angular.extend(this.createDateObject(days[i], this.formatDay), {
        secondary: days[i].getMonth() !== month,
        uid: scope.uniqueId + '-' + i
      });
    }

    scope.labels = new Array(7);
    for (var j = 0; j < 7; j++) {
      scope.labels[j] = {
        abbr: dateFilter(days[j].date, this.formatDayHeader),
        full: dateFilter(days[j].date, 'EEEE')
      };
    }

    scope.title = dateFilter(this.activeDate, this.formatDayTitle);
    scope.rows = this.split(days, 7);

    if (scope.showWeeks) {
      scope.weekNumbers = [];
      var thursdayIndex = (4 + 7 - this.startingDay) % 7,
          numWeeks = scope.rows.length;
      for (var curWeek = 0; curWeek < numWeeks; curWeek++) {
        scope.weekNumbers.push(
          getISO8601WeekNumber(scope.rows[curWeek][thursdayIndex].date));
      }
    }
  };

  this.compare = function(date1, date2) {
    var _date1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    var _date2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    _date1.setFullYear(date1.getFullYear());
    _date2.setFullYear(date2.getFullYear());
    return _date1 - _date2;
  };

  function getISO8601WeekNumber(date) {
    var checkDate = new Date(date);
    checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7)); // Thursday
    var time = checkDate.getTime();
    checkDate.setMonth(0); // Compare with Jan 1
    checkDate.setDate(1);
    return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1;
  }

  this.handleKeyDown = function(key, evt) {
    var date = this.activeDate.getDate();

    if (key === 'left') {
      date = date - 1;
    } else if (key === 'up') {
      date = date - 7;
    } else if (key === 'right') {
      date = date + 1;
    } else if (key === 'down') {
      date = date + 7;
    } else if (key === 'pageup' || key === 'pagedown') {
      var month = this.activeDate.getMonth() + (key === 'pageup' ? - 1 : 1);
      this.activeDate.setMonth(month, 1);
      date = Math.min(getDaysInMonth(this.activeDate.getFullYear(), this.activeDate.getMonth()), date);
    } else if (key === 'home') {
      date = 1;
    } else if (key === 'end') {
      date = getDaysInMonth(this.activeDate.getFullYear(), this.activeDate.getMonth());
    }
    this.activeDate.setDate(date);
  };
}])

.controller('UibMonthpickerController', ['$scope', '$element', 'dateFilter', function(scope, $element, dateFilter) {
  this.step = { years: 1 };
  this.element = $element;

  this.init = function(ctrl) {
    angular.extend(ctrl, this);
    ctrl.refreshView();
  };

  this._refreshView = function() {
    var months = new Array(12),
        year = this.activeDate.getFullYear(),
        date;

    for (var i = 0; i < 12; i++) {
      date = new Date(this.activeDate);
      date.setFullYear(year, i, 1);
      months[i] = angular.extend(this.createDateObject(date, this.formatMonth), {
        uid: scope.uniqueId + '-' + i
      });
    }

    scope.title = dateFilter(this.activeDate, this.formatMonthTitle);
    scope.rows = this.split(months, this.monthColumns);
    scope.yearHeaderColspan = this.monthColumns > 3 ? this.monthColumns - 2 : 1;
  };

  this.compare = function(date1, date2) {
    var _date1 = new Date(date1.getFullYear(), date1.getMonth());
    var _date2 = new Date(date2.getFullYear(), date2.getMonth());
    _date1.setFullYear(date1.getFullYear());
    _date2.setFullYear(date2.getFullYear());
    return _date1 - _date2;
  };

  this.handleKeyDown = function(key, evt) {
    var date = this.activeDate.getMonth();

    if (key === 'left') {
      date = date - 1;
    } else if (key === 'up') {
      date = date - this.monthColumns;
    } else if (key === 'right') {
      date = date + 1;
    } else if (key === 'down') {
      date = date + this.monthColumns;
    } else if (key === 'pageup' || key === 'pagedown') {
      var year = this.activeDate.getFullYear() + (key === 'pageup' ? - 1 : 1);
      this.activeDate.setFullYear(year);
    } else if (key === 'home') {
      date = 0;
    } else if (key === 'end') {
      date = 11;
    }
    this.activeDate.setMonth(date);
  };
}])

.controller('UibYearpickerController', ['$scope', '$element', 'dateFilter', function(scope, $element, dateFilter) {
  var columns, range;
  this.element = $element;

  function getStartingYear(year) {
    return parseInt((year - 1) / range, 10) * range + 1;
  }

  this.yearpickerInit = function() {
    columns = this.yearColumns;
    range = this.yearRows * columns;
    this.step = { years: range };
  };

  this._refreshView = function() {
    var years = new Array(range), date;

    for (var i = 0, start = getStartingYear(this.activeDate.getFullYear()); i < range; i++) {
      date = new Date(this.activeDate);
      date.setFullYear(start + i, 0, 1);
      years[i] = angular.extend(this.createDateObject(date, this.formatYear), {
        uid: scope.uniqueId + '-' + i
      });
    }

    scope.title = [years[0].label, years[range - 1].label].join(' - ');
    scope.rows = this.split(years, columns);
    scope.columns = columns;
  };

  this.compare = function(date1, date2) {
    return date1.getFullYear() - date2.getFullYear();
  };

  this.handleKeyDown = function(key, evt) {
    var date = this.activeDate.getFullYear();

    if (key === 'left') {
      date = date - 1;
    } else if (key === 'up') {
      date = date - columns;
    } else if (key === 'right') {
      date = date + 1;
    } else if (key === 'down') {
      date = date + columns;
    } else if (key === 'pageup' || key === 'pagedown') {
      date += (key === 'pageup' ? - 1 : 1) * range;
    } else if (key === 'home') {
      date = getStartingYear(this.activeDate.getFullYear());
    } else if (key === 'end') {
      date = getStartingYear(this.activeDate.getFullYear()) + range - 1;
    }
    this.activeDate.setFullYear(date);
  };
}])

.directive('uibDatepicker', function() {
  return {
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/datepicker/datepicker.html';
    },
    scope: {
      datepickerOptions: '=?'
    },
    require: ['uibDatepicker', '^ngModel'],
    restrict: 'A',
    controller: 'UibDatepickerController',
    controllerAs: 'datepicker',
    link: function(scope, element, attrs, ctrls) {
      var datepickerCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      datepickerCtrl.init(ngModelCtrl);
    }
  };
})

.directive('uibDaypicker', function() {
  return {
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/datepicker/day.html';
    },
    require: ['^uibDatepicker', 'uibDaypicker'],
    restrict: 'A',
    controller: 'UibDaypickerController',
    link: function(scope, element, attrs, ctrls) {
      var datepickerCtrl = ctrls[0],
        daypickerCtrl = ctrls[1];

      daypickerCtrl.init(datepickerCtrl);
    }
  };
})

.directive('uibMonthpicker', function() {
  return {
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/datepicker/month.html';
    },
    require: ['^uibDatepicker', 'uibMonthpicker'],
    restrict: 'A',
    controller: 'UibMonthpickerController',
    link: function(scope, element, attrs, ctrls) {
      var datepickerCtrl = ctrls[0],
        monthpickerCtrl = ctrls[1];

      monthpickerCtrl.init(datepickerCtrl);
    }
  };
})

.directive('uibYearpicker', function() {
  return {
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'uib/template/datepicker/year.html';
    },
    require: ['^uibDatepicker', 'uibYearpicker'],
    restrict: 'A',
    controller: 'UibYearpickerController',
    link: function(scope, element, attrs, ctrls) {
      var ctrl = ctrls[0];
      angular.extend(ctrl, ctrls[1]);
      ctrl.yearpickerInit();

      ctrl.refreshView();
    }
  };
});

angular.module('ui.bootstrap.dateparser', [])

.service('uibDateParser', ['$log', '$locale', 'dateFilter', 'orderByFilter', function($log, $locale, dateFilter, orderByFilter) {
  // Pulled from https://github.com/mbostock/d3/blob/master/src/format/requote.js
  var SPECIAL_CHARACTERS_REGEXP = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;

  var localeId;
  var formatCodeToRegex;

  this.init = function() {
    localeId = $locale.id;

    this.parsers = {};
    this.formatters = {};

    formatCodeToRegex = [
      {
        key: 'yyyy',
        regex: '\\d{4}',
        apply: function(value) { this.year = +value; },
        formatter: function(date) {
          var _date = new Date();
          _date.setFullYear(Math.abs(date.getFullYear()));
          return dateFilter(_date, 'yyyy');
        }
      },
      {
        key: 'yy',
        regex: '\\d{2}',
        apply: function(value) { value = +value; this.year = value < 69 ? value + 2000 : value + 1900; },
        formatter: function(date) {
          var _date = new Date();
          _date.setFullYear(Math.abs(date.getFullYear()));
          return dateFilter(_date, 'yy');
        }
      },
      {
        key: 'y',
        regex: '\\d{1,4}',
        apply: function(value) { this.year = +value; },
        formatter: function(date) {
          var _date = new Date();
          _date.setFullYear(Math.abs(date.getFullYear()));
          return dateFilter(_date, 'y');
        }
      },
      {
        key: 'M!',
        regex: '0?[1-9]|1[0-2]',
        apply: function(value) { this.month = value - 1; },
        formatter: function(date) {
          var value = date.getMonth();
          if (/^[0-9]$/.test(value)) {
            return dateFilter(date, 'MM');
          }

          return dateFilter(date, 'M');
        }
      },
      {
        key: 'MMMM',
        regex: $locale.DATETIME_FORMATS.MONTH.join('|'),
        apply: function(value) { this.month = $locale.DATETIME_FORMATS.MONTH.indexOf(value); },
        formatter: function(date) { return dateFilter(date, 'MMMM'); }
      },
      {
        key: 'MMM',
        regex: $locale.DATETIME_FORMATS.SHORTMONTH.join('|'),
        apply: function(value) { this.month = $locale.DATETIME_FORMATS.SHORTMONTH.indexOf(value); },
        formatter: function(date) { return dateFilter(date, 'MMM'); }
      },
      {
        key: 'MM',
        regex: '0[1-9]|1[0-2]',
        apply: function(value) { this.month = value - 1; },
        formatter: function(date) { return dateFilter(date, 'MM'); }
      },
      {
        key: 'M',
        regex: '[1-9]|1[0-2]',
        apply: function(value) { this.month = value - 1; },
        formatter: function(date) { return dateFilter(date, 'M'); }
      },
      {
        key: 'd!',
        regex: '[0-2]?[0-9]{1}|3[0-1]{1}',
        apply: function(value) { this.date = +value; },
        formatter: function(date) {
          var value = date.getDate();
          if (/^[1-9]$/.test(value)) {
            return dateFilter(date, 'dd');
          }

          return dateFilter(date, 'd');
        }
      },
      {
        key: 'dd',
        regex: '[0-2][0-9]{1}|3[0-1]{1}',
        apply: function(value) { this.date = +value; },
        formatter: function(date) { return dateFilter(date, 'dd'); }
      },
      {
        key: 'd',
        regex: '[1-2]?[0-9]{1}|3[0-1]{1}',
        apply: function(value) { this.date = +value; },
        formatter: function(date) { return dateFilter(date, 'd'); }
      },
      {
        key: 'EEEE',
        regex: $locale.DATETIME_FORMATS.DAY.join('|'),
        formatter: function(date) { return dateFilter(date, 'EEEE'); }
      },
      {
        key: 'EEE',
        regex: $locale.DATETIME_FORMATS.SHORTDAY.join('|'),
        formatter: function(date) { return dateFilter(date, 'EEE'); }
      },
      {
        key: 'HH',
        regex: '(?:0|1)[0-9]|2[0-3]',
        apply: function(value) { this.hours = +value; },
        formatter: function(date) { return dateFilter(date, 'HH'); }
      },
      {
        key: 'hh',
        regex: '0[0-9]|1[0-2]',
        apply: function(value) { this.hours = +value; },
        formatter: function(date) { return dateFilter(date, 'hh'); }
      },
      {
        key: 'H',
        regex: '1?[0-9]|2[0-3]',
        apply: function(value) { this.hours = +value; },
        formatter: function(date) { return dateFilter(date, 'H'); }
      },
      {
        key: 'h',
        regex: '[0-9]|1[0-2]',
        apply: function(value) { this.hours = +value; },
        formatter: function(date) { return dateFilter(date, 'h'); }
      },
      {
        key: 'mm',
        regex: '[0-5][0-9]',
        apply: function(value) { this.minutes = +value; },
        formatter: function(date) { return dateFilter(date, 'mm'); }
      },
      {
        key: 'm',
        regex: '[0-9]|[1-5][0-9]',
        apply: function(value) { this.minutes = +value; },
        formatter: function(date) { return dateFilter(date, 'm'); }
      },
      {
        key: 'sss',
        regex: '[0-9][0-9][0-9]',
        apply: function(value) { this.milliseconds = +value; },
        formatter: function(date) { return dateFilter(date, 'sss'); }
      },
      {
        key: 'ss',
        regex: '[0-5][0-9]',
        apply: function(value) { this.seconds = +value; },
        formatter: function(date) { return dateFilter(date, 'ss'); }
      },
      {
        key: 's',
        regex: '[0-9]|[1-5][0-9]',
        apply: function(value) { this.seconds = +value; },
        formatter: function(date) { return dateFilter(date, 's'); }
      },
      {
        key: 'a',
        regex: $locale.DATETIME_FORMATS.AMPMS.join('|'),
        apply: function(value) {
          if (this.hours === 12) {
            this.hours = 0;
          }

          if (value === 'PM') {
            this.hours += 12;
          }
        },
        formatter: function(date) { return dateFilter(date, 'a'); }
      },
      {
        key: 'Z',
        regex: '[+-]\\d{4}',
        apply: function(value) {
          var matches = value.match(/([+-])(\d{2})(\d{2})/),
            sign = matches[1],
            hours = matches[2],
            minutes = matches[3];
          this.hours += toInt(sign + hours);
          this.minutes += toInt(sign + minutes);
        },
        formatter: function(date) {
          return dateFilter(date, 'Z');
        }
      },
      {
        key: 'ww',
        regex: '[0-4][0-9]|5[0-3]',
        formatter: function(date) { return dateFilter(date, 'ww'); }
      },
      {
        key: 'w',
        regex: '[0-9]|[1-4][0-9]|5[0-3]',
        formatter: function(date) { return dateFilter(date, 'w'); }
      },
      {
        key: 'GGGG',
        regex: $locale.DATETIME_FORMATS.ERANAMES.join('|').replace(/\s/g, '\\s'),
        formatter: function(date) { return dateFilter(date, 'GGGG'); }
      },
      {
        key: 'GGG',
        regex: $locale.DATETIME_FORMATS.ERAS.join('|'),
        formatter: function(date) { return dateFilter(date, 'GGG'); }
      },
      {
        key: 'GG',
        regex: $locale.DATETIME_FORMATS.ERAS.join('|'),
        formatter: function(date) { return dateFilter(date, 'GG'); }
      },
      {
        key: 'G',
        regex: $locale.DATETIME_FORMATS.ERAS.join('|'),
        formatter: function(date) { return dateFilter(date, 'G'); }
      }
    ];
  };

  this.init();

  function createParser(format) {
    var map = [], regex = format.split('');

    // check for literal values
    var quoteIndex = format.indexOf('\'');
    if (quoteIndex > -1) {
      var inLiteral = false;
      format = format.split('');
      for (var i = quoteIndex; i < format.length; i++) {
        if (inLiteral) {
          if (format[i] === '\'') {
            if (i + 1 < format.length && format[i+1] === '\'') { // escaped single quote
              format[i+1] = '$';
              regex[i+1] = '';
            } else { // end of literal
              regex[i] = '';
              inLiteral = false;
            }
          }
          format[i] = '$';
        } else {
          if (format[i] === '\'') { // start of literal
            format[i] = '$';
            regex[i] = '';
            inLiteral = true;
          }
        }
      }

      format = format.join('');
    }

    angular.forEach(formatCodeToRegex, function(data) {
      var index = format.indexOf(data.key);

      if (index > -1) {
        format = format.split('');

        regex[index] = '(' + data.regex + ')';
        format[index] = '$'; // Custom symbol to define consumed part of format
        for (var i = index + 1, n = index + data.key.length; i < n; i++) {
          regex[i] = '';
          format[i] = '$';
        }
        format = format.join('');

        map.push({
          index: index,
          key: data.key,
          apply: data.apply,
          matcher: data.regex
        });
      }
    });

    return {
      regex: new RegExp('^' + regex.join('') + '$'),
      map: orderByFilter(map, 'index')
    };
  }

  function createFormatter(format) {
    var formatters = [];
    var i = 0;
    var formatter, literalIdx;
    while (i < format.length) {
      if (angular.isNumber(literalIdx)) {
        if (format.charAt(i) === '\'') {
          if (i + 1 >= format.length || format.charAt(i + 1) !== '\'') {
            formatters.push(constructLiteralFormatter(format, literalIdx, i));
            literalIdx = null;
          }
        } else if (i === format.length) {
          while (literalIdx < format.length) {
            formatter = constructFormatterFromIdx(format, literalIdx);
            formatters.push(formatter);
            literalIdx = formatter.endIdx;
          }
        }

        i++;
        continue;
      }

      if (format.charAt(i) === '\'') {
        literalIdx = i;
        i++;
        continue;
      }

      formatter = constructFormatterFromIdx(format, i);

      formatters.push(formatter.parser);
      i = formatter.endIdx;
    }

    return formatters;
  }

  function constructLiteralFormatter(format, literalIdx, endIdx) {
    return function() {
      return format.substr(literalIdx + 1, endIdx - literalIdx - 1);
    };
  }

  function constructFormatterFromIdx(format, i) {
    var currentPosStr = format.substr(i);
    for (var j = 0; j < formatCodeToRegex.length; j++) {
      if (new RegExp('^' + formatCodeToRegex[j].key).test(currentPosStr)) {
        var data = formatCodeToRegex[j];
        return {
          endIdx: i + data.key.length,
          parser: data.formatter
        };
      }
    }

    return {
      endIdx: i + 1,
      parser: function() {
        return currentPosStr.charAt(0);
      }
    };
  }

  this.filter = function(date, format) {
    if (!angular.isDate(date) || isNaN(date) || !format) {
      return '';
    }

    format = $locale.DATETIME_FORMATS[format] || format;

    if ($locale.id !== localeId) {
      this.init();
    }

    if (!this.formatters[format]) {
      this.formatters[format] = createFormatter(format);
    }

    var formatters = this.formatters[format];

    return formatters.reduce(function(str, formatter) {
      return str + formatter(date);
    }, '');
  };

  this.parse = function(input, format, baseDate) {
    if (!angular.isString(input) || !format) {
      return input;
    }

    format = $locale.DATETIME_FORMATS[format] || format;
    format = format.replace(SPECIAL_CHARACTERS_REGEXP, '\\$&');

    if ($locale.id !== localeId) {
      this.init();
    }

    if (!this.parsers[format]) {
      this.parsers[format] = createParser(format, 'apply');
    }

    var parser = this.parsers[format],
        regex = parser.regex,
        map = parser.map,
        results = input.match(regex),
        tzOffset = false;
    if (results && results.length) {
      var fields, dt;
      if (angular.isDate(baseDate) && !isNaN(baseDate.getTime())) {
        fields = {
          year: baseDate.getFullYear(),
          month: baseDate.getMonth(),
          date: baseDate.getDate(),
          hours: baseDate.getHours(),
          minutes: baseDate.getMinutes(),
          seconds: baseDate.getSeconds(),
          milliseconds: baseDate.getMilliseconds()
        };
      } else {
        if (baseDate) {
          $log.warn('dateparser:', 'baseDate is not a valid date');
        }
        fields = { year: 1900, month: 0, date: 1, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
      }

      for (var i = 1, n = results.length; i < n; i++) {
        var mapper = map[i - 1];
        if (mapper.matcher === 'Z') {
          tzOffset = true;
        }

        if (mapper.apply) {
          mapper.apply.call(fields, results[i]);
        }
      }

      var datesetter = tzOffset ? Date.prototype.setUTCFullYear :
        Date.prototype.setFullYear;
      var timesetter = tzOffset ? Date.prototype.setUTCHours :
        Date.prototype.setHours;

      if (isValid(fields.year, fields.month, fields.date)) {
        if (angular.isDate(baseDate) && !isNaN(baseDate.getTime()) && !tzOffset) {
          dt = new Date(baseDate);
          datesetter.call(dt, fields.year, fields.month, fields.date);
          timesetter.call(dt, fields.hours, fields.minutes,
            fields.seconds, fields.milliseconds);
        } else {
          dt = new Date(0);
          datesetter.call(dt, fields.year, fields.month, fields.date);
          timesetter.call(dt, fields.hours || 0, fields.minutes || 0,
            fields.seconds || 0, fields.milliseconds || 0);
        }
      }

      return dt;
    }
  };

  // Check if date is valid for specific month (and year for February).
  // Month: 0 = Jan, 1 = Feb, etc
  function isValid(year, month, date) {
    if (date < 1) {
      return false;
    }

    if (month === 1 && date > 28) {
      return date === 29 && (year % 4 === 0 && year % 100 !== 0 || year % 400 === 0);
    }

    if (month === 3 || month === 5 || month === 8 || month === 10) {
      return date < 31;
    }

    return true;
  }

  function toInt(str) {
    return parseInt(str, 10);
  }

  this.toTimezone = toTimezone;
  this.fromTimezone = fromTimezone;
  this.timezoneToOffset = timezoneToOffset;
  this.addDateMinutes = addDateMinutes;
  this.convertTimezoneToLocal = convertTimezoneToLocal;

  function toTimezone(date, timezone) {
    return date && timezone ? convertTimezoneToLocal(date, timezone) : date;
  }

  function fromTimezone(date, timezone) {
    return date && timezone ? convertTimezoneToLocal(date, timezone, true) : date;
  }

  //https://github.com/angular/angular.js/blob/622c42169699ec07fc6daaa19fe6d224e5d2f70e/src/Angular.js#L1207
  function timezoneToOffset(timezone, fallback) {
    timezone = timezone.replace(/:/g, '');
    var requestedTimezoneOffset = Date.parse('Jan 01, 1970 00:00:00 ' + timezone) / 60000;
    return isNaN(requestedTimezoneOffset) ? fallback : requestedTimezoneOffset;
  }

  function addDateMinutes(date, minutes) {
    date = new Date(date.getTime());
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  }

  function convertTimezoneToLocal(date, timezone, reverse) {
    reverse = reverse ? -1 : 1;
    var dateTimezoneOffset = date.getTimezoneOffset();
    var timezoneOffset = timezoneToOffset(timezone, dateTimezoneOffset);
    return addDateMinutes(date, reverse * (timezoneOffset - dateTimezoneOffset));
  }
}]);

// Avoiding use of ng-class as it creates a lot of watchers when a class is to be applied to
// at most one element.
angular.module('ui.bootstrap.isClass', [])
.directive('uibIsClass', [
         '$animate',
function ($animate) {
  //                    11111111          22222222
  var ON_REGEXP = /^\s*([\s\S]+?)\s+on\s+([\s\S]+?)\s*$/;
  //                    11111111           22222222
  var IS_REGEXP = /^\s*([\s\S]+?)\s+for\s+([\s\S]+?)\s*$/;

  var dataPerTracked = {};

  return {
    restrict: 'A',
    compile: function(tElement, tAttrs) {
      var linkedScopes = [];
      var instances = [];
      var expToData = {};
      var lastActivated = null;
      var onExpMatches = tAttrs.uibIsClass.match(ON_REGEXP);
      var onExp = onExpMatches[2];
      var expsStr = onExpMatches[1];
      var exps = expsStr.split(',');

      return linkFn;

      function linkFn(scope, element, attrs) {
        linkedScopes.push(scope);
        instances.push({
          scope: scope,
          element: element
        });

        exps.forEach(function(exp, k) {
          addForExp(exp, scope);
        });

        scope.$on('$destroy', removeScope);
      }

      function addForExp(exp, scope) {
        var matches = exp.match(IS_REGEXP);
        var clazz = scope.$eval(matches[1]);
        var compareWithExp = matches[2];
        var data = expToData[exp];
        if (!data) {
          var watchFn = function(compareWithVal) {
            var newActivated = null;
            instances.some(function(instance) {
              var thisVal = instance.scope.$eval(onExp);
              if (thisVal === compareWithVal) {
                newActivated = instance;
                return true;
              }
            });
            if (data.lastActivated !== newActivated) {
              if (data.lastActivated) {
                $animate.removeClass(data.lastActivated.element, clazz);
              }
              if (newActivated) {
                $animate.addClass(newActivated.element, clazz);
              }
              data.lastActivated = newActivated;
            }
          };
          expToData[exp] = data = {
            lastActivated: null,
            scope: scope,
            watchFn: watchFn,
            compareWithExp: compareWithExp,
            watcher: scope.$watch(compareWithExp, watchFn)
          };
        }
        data.watchFn(scope.$eval(compareWithExp));
      }

      function removeScope(e) {
        var removedScope = e.targetScope;
        var index = linkedScopes.indexOf(removedScope);
        linkedScopes.splice(index, 1);
        instances.splice(index, 1);
        if (linkedScopes.length) {
          var newWatchScope = linkedScopes[0];
          angular.forEach(expToData, function(data) {
            if (data.scope === removedScope) {
              data.watcher = newWatchScope.$watch(data.compareWithExp, data.watchFn);
              data.scope = newWatchScope;
            }
          });
        } else {
          expToData = {};
        }
      }
    }
  };
}]);
angular.module('ui.bootstrap.position', [])

/**
 * A set of utility methods for working with the DOM.
 * It is meant to be used where we need to absolute-position elements in
 * relation to another element (this is the case for tooltips, popovers,
 * typeahead suggestions etc.).
 */
  .factory('$uibPosition', ['$document', '$window', function($document, $window) {
    /**
     * Used by scrollbarWidth() function to cache scrollbar's width.
     * Do not access this variable directly, use scrollbarWidth() instead.
     */
    var SCROLLBAR_WIDTH;
    /**
     * scrollbar on body and html element in IE and Edge overlay
     * content and should be considered 0 width.
     */
    var BODY_SCROLLBAR_WIDTH;
    var OVERFLOW_REGEX = {
      normal: /(auto|scroll)/,
      hidden: /(auto|scroll|hidden)/
    };
    var PLACEMENT_REGEX = {
      auto: /\s?auto?\s?/i,
      primary: /^(top|bottom|left|right)$/,
      secondary: /^(top|bottom|left|right|center)$/,
      vertical: /^(top|bottom)$/
    };
    var BODY_REGEX = /(HTML|BODY)/;

    return {

      /**
       * Provides a raw DOM element from a jQuery/jQLite element.
       *
       * @param {element} elem - The element to convert.
       *
       * @returns {element} A HTML element.
       */
      getRawNode: function(elem) {
        return elem.nodeName ? elem : elem[0] || elem;
      },

      /**
       * Provides a parsed number for a style property.  Strips
       * units and casts invalid numbers to 0.
       *
       * @param {string} value - The style value to parse.
       *
       * @returns {number} A valid number.
       */
      parseStyle: function(value) {
        value = parseFloat(value);
        return isFinite(value) ? value : 0;
      },

      /**
       * Provides the closest positioned ancestor.
       *
       * @param {element} element - The element to get the offest parent for.
       *
       * @returns {element} The closest positioned ancestor.
       */
      offsetParent: function(elem) {
        elem = this.getRawNode(elem);

        var offsetParent = elem.offsetParent || $document[0].documentElement;

        function isStaticPositioned(el) {
          return ($window.getComputedStyle(el).position || 'static') === 'static';
        }

        while (offsetParent && offsetParent !== $document[0].documentElement && isStaticPositioned(offsetParent)) {
          offsetParent = offsetParent.offsetParent;
        }

        return offsetParent || $document[0].documentElement;
      },

      /**
       * Provides the scrollbar width, concept from TWBS measureScrollbar()
       * function in https://github.com/twbs/bootstrap/blob/master/js/modal.js
       * In IE and Edge, scollbar on body and html element overlay and should
       * return a width of 0.
       *
       * @returns {number} The width of the browser scollbar.
       */
      scrollbarWidth: function(isBody) {
        if (isBody) {
          if (angular.isUndefined(BODY_SCROLLBAR_WIDTH)) {
            var bodyElem = $document.find('body');
            bodyElem.addClass('uib-position-body-scrollbar-measure');
            BODY_SCROLLBAR_WIDTH = $window.innerWidth - bodyElem[0].clientWidth;
            BODY_SCROLLBAR_WIDTH = isFinite(BODY_SCROLLBAR_WIDTH) ? BODY_SCROLLBAR_WIDTH : 0;
            bodyElem.removeClass('uib-position-body-scrollbar-measure');
          }
          return BODY_SCROLLBAR_WIDTH;
        }

        if (angular.isUndefined(SCROLLBAR_WIDTH)) {
          var scrollElem = angular.element('<div class="uib-position-scrollbar-measure"></div>');
          $document.find('body').append(scrollElem);
          SCROLLBAR_WIDTH = scrollElem[0].offsetWidth - scrollElem[0].clientWidth;
          SCROLLBAR_WIDTH = isFinite(SCROLLBAR_WIDTH) ? SCROLLBAR_WIDTH : 0;
          scrollElem.remove();
        }

        return SCROLLBAR_WIDTH;
      },

      /**
       * Provides the padding required on an element to replace the scrollbar.
       *
       * @returns {object} An object with the following properties:
       *   <ul>
       *     <li>**scrollbarWidth**: the width of the scrollbar</li>
       *     <li>**widthOverflow**: whether the the width is overflowing</li>
       *     <li>**right**: the amount of right padding on the element needed to replace the scrollbar</li>
       *     <li>**rightOriginal**: the amount of right padding currently on the element</li>
       *     <li>**heightOverflow**: whether the the height is overflowing</li>
       *     <li>**bottom**: the amount of bottom padding on the element needed to replace the scrollbar</li>
       *     <li>**bottomOriginal**: the amount of bottom padding currently on the element</li>
       *   </ul>
       */
      scrollbarPadding: function(elem) {
        elem = this.getRawNode(elem);

        var elemStyle = $window.getComputedStyle(elem);
        var paddingRight = this.parseStyle(elemStyle.paddingRight);
        var paddingBottom = this.parseStyle(elemStyle.paddingBottom);
        var scrollParent = this.scrollParent(elem, false, true);
        var scrollbarWidth = this.scrollbarWidth(scrollParent, BODY_REGEX.test(scrollParent.tagName));

        return {
          scrollbarWidth: scrollbarWidth,
          widthOverflow: scrollParent.scrollWidth > scrollParent.clientWidth,
          right: paddingRight + scrollbarWidth,
          originalRight: paddingRight,
          heightOverflow: scrollParent.scrollHeight > scrollParent.clientHeight,
          bottom: paddingBottom + scrollbarWidth,
          originalBottom: paddingBottom
         };
      },

      /**
       * Checks to see if the element is scrollable.
       *
       * @param {element} elem - The element to check.
       * @param {boolean=} [includeHidden=false] - Should scroll style of 'hidden' be considered,
       *   default is false.
       *
       * @returns {boolean} Whether the element is scrollable.
       */
      isScrollable: function(elem, includeHidden) {
        elem = this.getRawNode(elem);

        var overflowRegex = includeHidden ? OVERFLOW_REGEX.hidden : OVERFLOW_REGEX.normal;
        var elemStyle = $window.getComputedStyle(elem);
        return overflowRegex.test(elemStyle.overflow + elemStyle.overflowY + elemStyle.overflowX);
      },

      /**
       * Provides the closest scrollable ancestor.
       * A port of the jQuery UI scrollParent method:
       * https://github.com/jquery/jquery-ui/blob/master/ui/scroll-parent.js
       *
       * @param {element} elem - The element to find the scroll parent of.
       * @param {boolean=} [includeHidden=false] - Should scroll style of 'hidden' be considered,
       *   default is false.
       * @param {boolean=} [includeSelf=false] - Should the element being passed be
       * included in the scrollable llokup.
       *
       * @returns {element} A HTML element.
       */
      scrollParent: function(elem, includeHidden, includeSelf) {
        elem = this.getRawNode(elem);

        var overflowRegex = includeHidden ? OVERFLOW_REGEX.hidden : OVERFLOW_REGEX.normal;
        var documentEl = $document[0].documentElement;
        var elemStyle = $window.getComputedStyle(elem);
        if (includeSelf && overflowRegex.test(elemStyle.overflow + elemStyle.overflowY + elemStyle.overflowX)) {
          return elem;
        }
        var excludeStatic = elemStyle.position === 'absolute';
        var scrollParent = elem.parentElement || documentEl;

        if (scrollParent === documentEl || elemStyle.position === 'fixed') {
          return documentEl;
        }

        while (scrollParent.parentElement && scrollParent !== documentEl) {
          var spStyle = $window.getComputedStyle(scrollParent);
          if (excludeStatic && spStyle.position !== 'static') {
            excludeStatic = false;
          }

          if (!excludeStatic && overflowRegex.test(spStyle.overflow + spStyle.overflowY + spStyle.overflowX)) {
            break;
          }
          scrollParent = scrollParent.parentElement;
        }

        return scrollParent;
      },

      /**
       * Provides read-only equivalent of jQuery's position function:
       * http://api.jquery.com/position/ - distance to closest positioned
       * ancestor.  Does not account for margins by default like jQuery position.
       *
       * @param {element} elem - The element to caclulate the position on.
       * @param {boolean=} [includeMargins=false] - Should margins be accounted
       * for, default is false.
       *
       * @returns {object} An object with the following properties:
       *   <ul>
       *     <li>**width**: the width of the element</li>
       *     <li>**height**: the height of the element</li>
       *     <li>**top**: distance to top edge of offset parent</li>
       *     <li>**left**: distance to left edge of offset parent</li>
       *   </ul>
       */
      position: function(elem, includeMagins) {
        elem = this.getRawNode(elem);

        var elemOffset = this.offset(elem);
        if (includeMagins) {
          var elemStyle = $window.getComputedStyle(elem);
          elemOffset.top -= this.parseStyle(elemStyle.marginTop);
          elemOffset.left -= this.parseStyle(elemStyle.marginLeft);
        }
        var parent = this.offsetParent(elem);
        var parentOffset = {top: 0, left: 0};

        if (parent !== $document[0].documentElement) {
          parentOffset = this.offset(parent);
          parentOffset.top += parent.clientTop - parent.scrollTop;
          parentOffset.left += parent.clientLeft - parent.scrollLeft;
        }

        return {
          width: Math.round(angular.isNumber(elemOffset.width) ? elemOffset.width : elem.offsetWidth),
          height: Math.round(angular.isNumber(elemOffset.height) ? elemOffset.height : elem.offsetHeight),
          top: Math.round(elemOffset.top - parentOffset.top),
          left: Math.round(elemOffset.left - parentOffset.left)
        };
      },

      /**
       * Provides read-only equivalent of jQuery's offset function:
       * http://api.jquery.com/offset/ - distance to viewport.  Does
       * not account for borders, margins, or padding on the body
       * element.
       *
       * @param {element} elem - The element to calculate the offset on.
       *
       * @returns {object} An object with the following properties:
       *   <ul>
       *     <li>**width**: the width of the element</li>
       *     <li>**height**: the height of the element</li>
       *     <li>**top**: distance to top edge of viewport</li>
       *     <li>**right**: distance to bottom edge of viewport</li>
       *   </ul>
       */
      offset: function(elem) {
        elem = this.getRawNode(elem);

        var elemBCR = elem.getBoundingClientRect();
        return {
          width: Math.round(angular.isNumber(elemBCR.width) ? elemBCR.width : elem.offsetWidth),
          height: Math.round(angular.isNumber(elemBCR.height) ? elemBCR.height : elem.offsetHeight),
          top: Math.round(elemBCR.top + ($window.pageYOffset || $document[0].documentElement.scrollTop)),
          left: Math.round(elemBCR.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft))
        };
      },

      /**
       * Provides offset distance to the closest scrollable ancestor
       * or viewport.  Accounts for border and scrollbar width.
       *
       * Right and bottom dimensions represent the distance to the
       * respective edge of the viewport element.  If the element
       * edge extends beyond the viewport, a negative value will be
       * reported.
       *
       * @param {element} elem - The element to get the viewport offset for.
       * @param {boolean=} [useDocument=false] - Should the viewport be the document element instead
       * of the first scrollable element, default is false.
       * @param {boolean=} [includePadding=true] - Should the padding on the offset parent element
       * be accounted for, default is true.
       *
       * @returns {object} An object with the following properties:
       *   <ul>
       *     <li>**top**: distance to the top content edge of viewport element</li>
       *     <li>**bottom**: distance to the bottom content edge of viewport element</li>
       *     <li>**left**: distance to the left content edge of viewport element</li>
       *     <li>**right**: distance to the right content edge of viewport element</li>
       *   </ul>
       */
      viewportOffset: function(elem, useDocument, includePadding) {
        elem = this.getRawNode(elem);
        includePadding = includePadding !== false ? true : false;

        var elemBCR = elem.getBoundingClientRect();
        var offsetBCR = {top: 0, left: 0, bottom: 0, right: 0};

        var offsetParent = useDocument ? $document[0].documentElement : this.scrollParent(elem);
        var offsetParentBCR = offsetParent.getBoundingClientRect();

        offsetBCR.top = offsetParentBCR.top + offsetParent.clientTop;
        offsetBCR.left = offsetParentBCR.left + offsetParent.clientLeft;
        if (offsetParent === $document[0].documentElement) {
          offsetBCR.top += $window.pageYOffset;
          offsetBCR.left += $window.pageXOffset;
        }
        offsetBCR.bottom = offsetBCR.top + offsetParent.clientHeight;
        offsetBCR.right = offsetBCR.left + offsetParent.clientWidth;

        if (includePadding) {
          var offsetParentStyle = $window.getComputedStyle(offsetParent);
          offsetBCR.top += this.parseStyle(offsetParentStyle.paddingTop);
          offsetBCR.bottom -= this.parseStyle(offsetParentStyle.paddingBottom);
          offsetBCR.left += this.parseStyle(offsetParentStyle.paddingLeft);
          offsetBCR.right -= this.parseStyle(offsetParentStyle.paddingRight);
        }

        return {
          top: Math.round(elemBCR.top - offsetBCR.top),
          bottom: Math.round(offsetBCR.bottom - elemBCR.bottom),
          left: Math.round(elemBCR.left - offsetBCR.left),
          right: Math.round(offsetBCR.right - elemBCR.right)
        };
      },

      /**
       * Provides an array of placement values parsed from a placement string.
       * Along with the 'auto' indicator, supported placement strings are:
       *   <ul>
       *     <li>top: element on top, horizontally centered on host element.</li>
       *     <li>top-left: element on top, left edge aligned with host element left edge.</li>
       *     <li>top-right: element on top, lerightft edge aligned with host element right edge.</li>
       *     <li>bottom: element on bottom, horizontally centered on host element.</li>
       *     <li>bottom-left: element on bottom, left edge aligned with host element left edge.</li>
       *     <li>bottom-right: element on bottom, right edge aligned with host element right edge.</li>
       *     <li>left: element on left, vertically centered on host element.</li>
       *     <li>left-top: element on left, top edge aligned with host element top edge.</li>
       *     <li>left-bottom: element on left, bottom edge aligned with host element bottom edge.</li>
       *     <li>right: element on right, vertically centered on host element.</li>
       *     <li>right-top: element on right, top edge aligned with host element top edge.</li>
       *     <li>right-bottom: element on right, bottom edge aligned with host element bottom edge.</li>
       *   </ul>
       * A placement string with an 'auto' indicator is expected to be
       * space separated from the placement, i.e: 'auto bottom-left'  If
       * the primary and secondary placement values do not match 'top,
       * bottom, left, right' then 'top' will be the primary placement and
       * 'center' will be the secondary placement.  If 'auto' is passed, true
       * will be returned as the 3rd value of the array.
       *
       * @param {string} placement - The placement string to parse.
       *
       * @returns {array} An array with the following values
       * <ul>
       *   <li>**[0]**: The primary placement.</li>
       *   <li>**[1]**: The secondary placement.</li>
       *   <li>**[2]**: If auto is passed: true, else undefined.</li>
       * </ul>
       */
      parsePlacement: function(placement) {
        var autoPlace = PLACEMENT_REGEX.auto.test(placement);
        if (autoPlace) {
          placement = placement.replace(PLACEMENT_REGEX.auto, '');
        }

        placement = placement.split('-');

        placement[0] = placement[0] || 'top';
        if (!PLACEMENT_REGEX.primary.test(placement[0])) {
          placement[0] = 'top';
        }

        placement[1] = placement[1] || 'center';
        if (!PLACEMENT_REGEX.secondary.test(placement[1])) {
          placement[1] = 'center';
        }

        if (autoPlace) {
          placement[2] = true;
        } else {
          placement[2] = false;
        }

        return placement;
      },

      /**
       * Provides coordinates for an element to be positioned relative to
       * another element.  Passing 'auto' as part of the placement parameter
       * will enable smart placement - where the element fits. i.e:
       * 'auto left-top' will check to see if there is enough space to the left
       * of the hostElem to fit the targetElem, if not place right (same for secondary
       * top placement).  Available space is calculated using the viewportOffset
       * function.
       *
       * @param {element} hostElem - The element to position against.
       * @param {element} targetElem - The element to position.
       * @param {string=} [placement=top] - The placement for the targetElem,
       *   default is 'top'. 'center' is assumed as secondary placement for
       *   'top', 'left', 'right', and 'bottom' placements.  Available placements are:
       *   <ul>
       *     <li>top</li>
       *     <li>top-right</li>
       *     <li>top-left</li>
       *     <li>bottom</li>
       *     <li>bottom-left</li>
       *     <li>bottom-right</li>
       *     <li>left</li>
       *     <li>left-top</li>
       *     <li>left-bottom</li>
       *     <li>right</li>
       *     <li>right-top</li>
       *     <li>right-bottom</li>
       *   </ul>
       * @param {boolean=} [appendToBody=false] - Should the top and left values returned
       *   be calculated from the body element, default is false.
       *
       * @returns {object} An object with the following properties:
       *   <ul>
       *     <li>**top**: Value for targetElem top.</li>
       *     <li>**left**: Value for targetElem left.</li>
       *     <li>**placement**: The resolved placement.</li>
       *   </ul>
       */
      positionElements: function(hostElem, targetElem, placement, appendToBody) {
        hostElem = this.getRawNode(hostElem);
        targetElem = this.getRawNode(targetElem);

        // need to read from prop to support tests.
        var targetWidth = angular.isDefined(targetElem.offsetWidth) ? targetElem.offsetWidth : targetElem.prop('offsetWidth');
        var targetHeight = angular.isDefined(targetElem.offsetHeight) ? targetElem.offsetHeight : targetElem.prop('offsetHeight');

        placement = this.parsePlacement(placement);

        var hostElemPos = appendToBody ? this.offset(hostElem) : this.position(hostElem);
        var targetElemPos = {top: 0, left: 0, placement: ''};

        if (placement[2]) {
          var viewportOffset = this.viewportOffset(hostElem, appendToBody);

          var targetElemStyle = $window.getComputedStyle(targetElem);
          var adjustedSize = {
            width: targetWidth + Math.round(Math.abs(this.parseStyle(targetElemStyle.marginLeft) + this.parseStyle(targetElemStyle.marginRight))),
            height: targetHeight + Math.round(Math.abs(this.parseStyle(targetElemStyle.marginTop) + this.parseStyle(targetElemStyle.marginBottom)))
          };

          placement[0] = placement[0] === 'top' && adjustedSize.height > viewportOffset.top && adjustedSize.height <= viewportOffset.bottom ? 'bottom' :
                         placement[0] === 'bottom' && adjustedSize.height > viewportOffset.bottom && adjustedSize.height <= viewportOffset.top ? 'top' :
                         placement[0] === 'left' && adjustedSize.width > viewportOffset.left && adjustedSize.width <= viewportOffset.right ? 'right' :
                         placement[0] === 'right' && adjustedSize.width > viewportOffset.right && adjustedSize.width <= viewportOffset.left ? 'left' :
                         placement[0];

          placement[1] = placement[1] === 'top' && adjustedSize.height - hostElemPos.height > viewportOffset.bottom && adjustedSize.height - hostElemPos.height <= viewportOffset.top ? 'bottom' :
                         placement[1] === 'bottom' && adjustedSize.height - hostElemPos.height > viewportOffset.top && adjustedSize.height - hostElemPos.height <= viewportOffset.bottom ? 'top' :
                         placement[1] === 'left' && adjustedSize.width - hostElemPos.width > viewportOffset.right && adjustedSize.width - hostElemPos.width <= viewportOffset.left ? 'right' :
                         placement[1] === 'right' && adjustedSize.width - hostElemPos.width > viewportOffset.left && adjustedSize.width - hostElemPos.width <= viewportOffset.right ? 'left' :
                         placement[1];

          if (placement[1] === 'center') {
            if (PLACEMENT_REGEX.vertical.test(placement[0])) {
              var xOverflow = hostElemPos.width / 2 - targetWidth / 2;
              if (viewportOffset.left + xOverflow < 0 && adjustedSize.width - hostElemPos.width <= viewportOffset.right) {
                placement[1] = 'left';
              } else if (viewportOffset.right + xOverflow < 0 && adjustedSize.width - hostElemPos.width <= viewportOffset.left) {
                placement[1] = 'right';
              }
            } else {
              var yOverflow = hostElemPos.height / 2 - adjustedSize.height / 2;
              if (viewportOffset.top + yOverflow < 0 && adjustedSize.height - hostElemPos.height <= viewportOffset.bottom) {
                placement[1] = 'top';
              } else if (viewportOffset.bottom + yOverflow < 0 && adjustedSize.height - hostElemPos.height <= viewportOffset.top) {
                placement[1] = 'bottom';
              }
            }
          }
        }

        switch (placement[0]) {
          case 'top':
            targetElemPos.top = hostElemPos.top - targetHeight;
            break;
          case 'bottom':
            targetElemPos.top = hostElemPos.top + hostElemPos.height;
            break;
          case 'left':
            targetElemPos.left = hostElemPos.left - targetWidth;
            break;
          case 'right':
            targetElemPos.left = hostElemPos.left + hostElemPos.width;
            break;
        }

        switch (placement[1]) {
          case 'top':
            targetElemPos.top = hostElemPos.top;
            break;
          case 'bottom':
            targetElemPos.top = hostElemPos.top + hostElemPos.height - targetHeight;
            break;
          case 'left':
            targetElemPos.left = hostElemPos.left;
            break;
          case 'right':
            targetElemPos.left = hostElemPos.left + hostElemPos.width - targetWidth;
            break;
          case 'center':
            if (PLACEMENT_REGEX.vertical.test(placement[0])) {
              targetElemPos.left = hostElemPos.left + hostElemPos.width / 2 - targetWidth / 2;
            } else {
              targetElemPos.top = hostElemPos.top + hostElemPos.height / 2 - targetHeight / 2;
            }
            break;
        }

        targetElemPos.top = Math.round(targetElemPos.top);
        targetElemPos.left = Math.round(targetElemPos.left);
        targetElemPos.placement = placement[1] === 'center' ? placement[0] : placement[0] + '-' + placement[1];

        return targetElemPos;
      },

      /**
       * Provides a way to adjust the top positioning after first
       * render to correctly align element to top after content
       * rendering causes resized element height
       *
       * @param {array} placementClasses - The array of strings of classes
       * element should have.
       * @param {object} containerPosition - The object with container
       * position information
       * @param {number} initialHeight - The initial height for the elem.
       * @param {number} currentHeight - The current height for the elem.
       */
      adjustTop: function(placementClasses, containerPosition, initialHeight, currentHeight) {
        if (placementClasses.indexOf('top') !== -1 && initialHeight !== currentHeight) {
          return {
            top: containerPosition.top - currentHeight + 'px'
          };
        }
      },

      /**
       * Provides a way for positioning tooltip & dropdown
       * arrows when using placement options beyond the standard
       * left, right, top, or bottom.
       *
       * @param {element} elem - The tooltip/dropdown element.
       * @param {string} placement - The placement for the elem.
       */
      positionArrow: function(elem, placement) {
        elem = this.getRawNode(elem);

        var innerElem = elem.querySelector('.tooltip-inner, .popover-inner');
        if (!innerElem) {
          return;
        }

        var isTooltip = angular.element(innerElem).hasClass('tooltip-inner');

        var arrowElem = isTooltip ? elem.querySelector('.tooltip-arrow') : elem.querySelector('.arrow');
        if (!arrowElem) {
          return;
        }

        var arrowCss = {
          top: '',
          bottom: '',
          left: '',
          right: ''
        };

        placement = this.parsePlacement(placement);
        if (placement[1] === 'center') {
          // no adjustment necessary - just reset styles
          angular.element(arrowElem).css(arrowCss);
          return;
        }

        var borderProp = 'border-' + placement[0] + '-width';
        var borderWidth = $window.getComputedStyle(arrowElem)[borderProp];

        var borderRadiusProp = 'border-';
        if (PLACEMENT_REGEX.vertical.test(placement[0])) {
          borderRadiusProp += placement[0] + '-' + placement[1];
        } else {
          borderRadiusProp += placement[1] + '-' + placement[0];
        }
        borderRadiusProp += '-radius';
        var borderRadius = $window.getComputedStyle(isTooltip ? innerElem : elem)[borderRadiusProp];

        switch (placement[0]) {
          case 'top':
            arrowCss.bottom = isTooltip ? '0' : '-' + borderWidth;
            break;
          case 'bottom':
            arrowCss.top = isTooltip ? '0' : '-' + borderWidth;
            break;
          case 'left':
            arrowCss.right = isTooltip ? '0' : '-' + borderWidth;
            break;
          case 'right':
            arrowCss.left = isTooltip ? '0' : '-' + borderWidth;
            break;
        }

        arrowCss[placement[1]] = borderRadius;

        angular.element(arrowElem).css(arrowCss);
      }
    };
  }]);

angular.module("uib/template/datepickerPopup/popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/datepickerPopup/popup.html",
    "<ul class=\"uib-datepicker-popup dropdown-menu uib-position-measure\" dropdown-nested ng-if=\"isOpen\" ng-keydown=\"keydown($event)\" ng-click=\"$event.stopPropagation()\">\n" +
    "  <li ng-transclude></li>\n" +
    "  <li ng-if=\"showButtonBar\" class=\"uib-button-bar\">\n" +
    "    <span class=\"btn-group pull-left\">\n" +
    "      <button type=\"button\" class=\"btn btn-sm btn-info uib-datepicker-current\" ng-click=\"select('today', $event)\" ng-disabled=\"isDisabled('today')\">{{ getText('current') }}</button>\n" +
    "      <button type=\"button\" class=\"btn btn-sm btn-danger uib-clear\" ng-click=\"select(null, $event)\">{{ getText('clear') }}</button>\n" +
    "    </span>\n" +
    "    <button type=\"button\" class=\"btn btn-sm btn-success pull-right uib-close\" ng-click=\"close($event)\">{{ getText('close') }}</button>\n" +
    "  </li>\n" +
    "</ul>\n" +
    "");
}]);

angular.module("uib/template/datepicker/datepicker.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/datepicker/datepicker.html",
    "<div ng-switch=\"datepickerMode\">\n" +
    "  <div uib-daypicker ng-switch-when=\"day\" tabindex=\"0\" class=\"uib-daypicker\"></div>\n" +
    "  <div uib-monthpicker ng-switch-when=\"month\" tabindex=\"0\" class=\"uib-monthpicker\"></div>\n" +
    "  <div uib-yearpicker ng-switch-when=\"year\" tabindex=\"0\" class=\"uib-yearpicker\"></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("uib/template/datepicker/day.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/datepicker/day.html",
    "<table role=\"grid\" aria-labelledby=\"{{::uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
    "  <thead>\n" +
    "    <tr>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left uib-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
    "      <th colspan=\"{{::5 + showWeeks}}\"><button id=\"{{::uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm uib-title\" ng-click=\"toggleMode()\" ng-disabled=\"datepickerMode === maxMode\" tabindex=\"-1\"><strong>{{title}}</strong></button></th>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right uib-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
    "    </tr>\n" +
    "    <tr>\n" +
    "      <th ng-if=\"showWeeks\" class=\"text-center\"></th>\n" +
    "      <th ng-repeat=\"label in ::labels track by $index\" class=\"text-center\"><small aria-label=\"{{::label.full}}\">{{::label.abbr}}</small></th>\n" +
    "    </tr>\n" +
    "  </thead>\n" +
    "  <tbody>\n" +
    "    <tr class=\"uib-weeks\" ng-repeat=\"row in rows track by $index\" role=\"row\">\n" +
    "      <td ng-if=\"showWeeks\" class=\"text-center h6\"><em>{{ weekNumbers[$index] }}</em></td>\n" +
    "      <td ng-repeat=\"dt in row\" class=\"uib-day text-center\" role=\"gridcell\"\n" +
    "        id=\"{{::dt.uid}}\"\n" +
    "        ng-class=\"::dt.customClass\">\n" +
    "        <button type=\"button\" class=\"btn btn-default btn-sm\"\n" +
    "          uib-is-class=\"\n" +
    "            'btn-info' for selectedDt,\n" +
    "            'active' for activeDt\n" +
    "            on dt\"\n" +
    "          ng-click=\"select(dt.date)\"\n" +
    "          ng-disabled=\"::dt.disabled\"\n" +
    "          tabindex=\"-1\"><span ng-class=\"::{'text-muted': dt.secondary, 'text-info': dt.current}\">{{::dt.label}}</span></button>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "  </tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("uib/template/datepicker/month.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/datepicker/month.html",
    "<table role=\"grid\" aria-labelledby=\"{{::uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
    "  <thead>\n" +
    "    <tr>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left uib-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
    "      <th colspan=\"{{::yearHeaderColspan}}\"><button id=\"{{::uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm uib-title\" ng-click=\"toggleMode()\" ng-disabled=\"datepickerMode === maxMode\" tabindex=\"-1\"><strong>{{title}}</strong></button></th>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right uib-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
    "    </tr>\n" +
    "  </thead>\n" +
    "  <tbody>\n" +
    "    <tr class=\"uib-months\" ng-repeat=\"row in rows track by $index\" role=\"row\">\n" +
    "      <td ng-repeat=\"dt in row\" class=\"uib-month text-center\" role=\"gridcell\"\n" +
    "        id=\"{{::dt.uid}}\"\n" +
    "        ng-class=\"::dt.customClass\">\n" +
    "        <button type=\"button\" class=\"btn btn-default\"\n" +
    "          uib-is-class=\"\n" +
    "            'btn-info' for selectedDt,\n" +
    "            'active' for activeDt\n" +
    "            on dt\"\n" +
    "          ng-click=\"select(dt.date)\"\n" +
    "          ng-disabled=\"::dt.disabled\"\n" +
    "          tabindex=\"-1\"><span ng-class=\"::{'text-info': dt.current}\">{{::dt.label}}</span></button>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "  </tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("uib/template/datepicker/year.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uib/template/datepicker/year.html",
    "<table role=\"grid\" aria-labelledby=\"{{::uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
    "  <thead>\n" +
    "    <tr>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left uib-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
    "      <th colspan=\"{{::columns - 2}}\"><button id=\"{{::uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm uib-title\" ng-click=\"toggleMode()\" ng-disabled=\"datepickerMode === maxMode\" tabindex=\"-1\"><strong>{{title}}</strong></button></th>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right uib-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
    "    </tr>\n" +
    "  </thead>\n" +
    "  <tbody>\n" +
    "    <tr class=\"uib-years\" ng-repeat=\"row in rows track by $index\" role=\"row\">\n" +
    "      <td ng-repeat=\"dt in row\" class=\"uib-year text-center\" role=\"gridcell\"\n" +
    "        id=\"{{::dt.uid}}\"\n" +
    "        ng-class=\"::dt.customClass\">\n" +
    "        <button type=\"button\" class=\"btn btn-default\"\n" +
    "          uib-is-class=\"\n" +
    "            'btn-info' for selectedDt,\n" +
    "            'active' for activeDt\n" +
    "            on dt\"\n" +
    "          ng-click=\"select(dt.date)\"\n" +
    "          ng-disabled=\"::dt.disabled\"\n" +
    "          tabindex=\"-1\"><span ng-class=\"::{'text-info': dt.current}\">{{::dt.label}}</span></button>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "  </tbody>\n" +
    "</table>\n" +
    "");
}]);
angular.module('ui.bootstrap.datepickerPopup').run(function() {!angular.$$csp().noInlineStyle && !angular.$$uibDatepickerpopupCss && angular.element(document).find('head').prepend('<style type="text/css">.uib-datepicker-popup.dropdown-menu{display:block;float:none;margin:0;}.uib-button-bar{padding:10px 9px 2px;}</style>'); angular.$$uibDatepickerpopupCss = true; });
angular.module('ui.bootstrap.datepicker').run(function() {!angular.$$csp().noInlineStyle && !angular.$$uibDatepickerCss && angular.element(document).find('head').prepend('<style type="text/css">.uib-datepicker .uib-title{width:100%;}.uib-day button,.uib-month button,.uib-year button{min-width:100%;}.uib-left,.uib-right{width:100%}</style>'); angular.$$uibDatepickerCss = true; });
angular.module('ui.bootstrap.position').run(function() {!angular.$$csp().noInlineStyle && !angular.$$uibPositionCss && angular.element(document).find('head').prepend('<style type="text/css">.uib-position-measure{display:block !important;visibility:hidden !important;position:absolute !important;top:-9999px !important;left:-9999px !important;}.uib-position-scrollbar-measure{position:absolute !important;top:-9999px !important;width:50px !important;height:50px !important;overflow:scroll !important;}.uib-position-body-scrollbar-measure{overflow:scroll !important;}</style>'); angular.$$uibPositionCss = true; });