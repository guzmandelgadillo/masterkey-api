(function () {
    'use strict';
    angular.module("masterkey.api", ["ngSanitize", "ui.select", "pascalprecht.translate"]).config(["configurations", configure]);
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
            "urlbase": "bower_components/",
            "home": "masterkey-api/",
            "data": "data/",
            "templates": "templates/"
        }
    });
})(angular);


(function (angular) {
    'use strict';
    angular.module('masterkey.api')
      .factory('courseService', ["futureObjectService", courseService]);
    function courseService(futureService) {
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
            var url = "agency/course/1/agencyPromotion";
            return futureService.getFuturePagedObject(url);
        }

        function queryByCourseType(search, courseType) {
            var url = "agency/place/" + courseType;
            var params = { "q": search };

            return futureService.getFuturePagedObject(url, params);
        }

        function setQuoteDataScope(scope) {
            if (!scope) return;

        }

        return {
            getCourse: getCourse,
            getCourseVariant: getCourseVariant,
            getPlace: getPlace,
            listByCourseVariant: listByCourseVariant,
            listByPlaceAndCourseType: listByPlaceAndCourseType,
            listOptionalPromotion: listOptionalPromotion,
            queryByCourseType: queryByCourseType,
            setQuoteDataScope: setQuoteDataScope
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

        function getHeaders() {
            return {
                "X-Auth-Token": settings.authToken,
                "X-Auth-Tenant": settings.authTenant
            };
        }

        return {
            apiPath: apiPath,
            get: get,
            headers: getHeaders
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

        return {
            getDataPromise: getDataPromise,
            getFutureObject: getFutureObject,
            getFuturePagedObject: getFuturePagedObject,
            getFutureSingleObject: getFutureSingleObject,
            getPromise: getPromise
        };
    };
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
            replace: true,
            scope: {
                options: "=",
                serviceLine: "="
            }
        }
    }
})(angular);


(function (angular) {
    angular.module("masterkey.api").directive("mkQuote", ["dataFile", "quoteService", quoteDirective]);
    function quoteDirective(paths, quoteService) {
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
            }

            scope.refreshDraft = function (cmd, qty) {
                scope.cmd = quoteService.refreshCommand(cmd, scope.options);
                scope.options = updateOptions(scope.cmd, scope.options);
                scope.courseLine.qty = qty;

                // Aquí falta insertar el objeto scope.cmd
            }

            scope.setTab = function (tab) {
                scope.activeTab = tab;
            }

            function updateOptions(cmd, options) {
                return quoteService.updateOptions(scope, cmd, options);
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
        }

        return {
            link: link,
            templateUrl: templateUrl,
            replace: true,
            scope: {
                fee: "="
            }
        }
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
                scope.unfilteredList = courseService.listByPlaceAndCourseType(place, courseType);
                scope.unfilteredList.$promise.then(copyCourseList);
            };

            // Refreshing list of course types
            scope.refreshOptionslist = refreshOptionsList;

            // Copying list of course types to show on table
            function copyCourseList(response) {
                scope.courseList = _.map(scope.unfilteredList, function (item) { return item; });
                refreshOptionsList(scope.courseList);
            }

            function cityFilter(value, filter) {
                return countryFilter(value,filter) &&
                    value.institute.city.id == filter.city.id;
            }

            function countryFilter(value, filter) {
                return value.institute && value.institute.city && value.institute.city.country &&
                    value.institute.city.country.id == filter.city.country.id;
            }

            function schoolFilter(value, filter) {
                return value.institute && value.institute.school &&
                    value.institute.school.id == filter.school.id;
            }

            // Filtering options of filters
            function refreshOptionsList(courseList) {
                scope.options = {
                    cityList: [],
                    schoolList: []
                };
                for (var index = 0; index < courseList.length; index++) {
                    var value = courseList[index];
                    if (value.institute) {
                        var city = value.institute.city;
                        var school = value.institute.school;
                        if (city) {
                            var exist = _.some(scope.options.cityList, function (item, index) {
                                return item.id && item.id == city.id && item.country && item.country.id == city.country.id;
                            });
                            if (!exist)
                                scope.options.cityList.push(city);
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
    angular.module("masterkey.api").factory("quoteService", ["courseService", "DraftCommand", quoteService]);
    function quoteService(courseService, DraftCommand) {
        function setQuoteDataScope(scope, courseId, courseVariantId) {
            if (!scope) return;
            var courseData = courseService.getCourse(courseId);
            var variantData = courseService.getCourseVariant(courseId, courseVariantId);
            var eventlistData = courseService.listByCourseVariant(courseVariantId);
            var promotionlistData = courseService.listOptionalPromotion(courseId);
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
                agencyPromotionList: promotionlistData
            };
            scope.courseLine = scope.cmd.courseLine;

            function responseCourseData(response) {
                scope.cmd.course = courseData;
                // Default data for new Sales
                scope.opportunity.courseType = courseData.type;
                scope.opportunity.isClientStudent = true;
                tryUpdateOptions(scope.cmd);
            }

            function responseVariantData(response) {
                scope.cmd.courseLine.product = variantData;
                tryUpdateOptions(scope.cmd);
            }

            function responseEventlistData(response) {
                scope.cmd.courseLine.event = eventlistData[0];
                tryUpdateOptions(scope.cmd);
            }

            function tryUpdateOptions(cmd) {
                if (courseData.$resolved && variantData.$resolved && eventlistData.$resolved)
                    scope.options = updateOptions(scope, cmd);
            }
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

        function refreshCommand(draftCommand, options) {
            return angular.extend(new DraftCommand(), draftCommand, {
                courseLine: updateCourseLine(draftCommand.courseLine, options),
                accommodationLine: updateAccommodationLine(draftCommand)
            });
        }

        function updateCourseLine(courseLine, options) {
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
            setQuoteDataScope: setQuoteDataScope,
            refreshCommand: refreshCommand,
            updateOptions: updateOptions
        };
    }
})(angular);