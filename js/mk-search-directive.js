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
