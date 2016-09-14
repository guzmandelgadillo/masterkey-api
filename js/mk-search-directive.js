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
            };

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
            };

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
                    value.institute.city.country.id == filter.city.country.id &&
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
                        var exist = false;
                        var existObject = new T(value.institute);
                        if (city) {
                            var country = city.country;
                            if (country) {
                                exist = _.some(scope.options.cityList, existObject.existCity);
                                if (!exist)
                                    scope.options.cityList.push(city);
                                exist = _.some(scope.options.countryList, existObject.existCountry);
                                if (!exist)
                                    scope.options.countryList.push(country);
                            }
                        }
                        if (school) {
                            exist = _.some(scope.options.schoolList, existObject.existSchool);
                            if (!exist)
                                scope.options.schoolList.push(school);
                        }
                    }
                }
            }
        }

        function T(institute) {
            this.city = institute.city;
            this.country = institute.city ? institute.city.country : undefined;
            this.school = institute.school;
        }

        T.prototype.existCity = function (item, index) {
            return item.id && item.id == this.city.id && item.country && this.country && item.country.id == this.country.id;
        };

        T.prototype.existCountry = function (item, index) {
            return item.id == this.country.id;
        };

        T.prototype.existSchool = function (item, index) {
            return item.id && item.id == this.school.id;
        };

        return {
            restrict: 'EA',
            link: link,
            templateUrl: templateUrl,
            scope: {
                userToken: '=mkUser',
                mkSelectedCourse: "&"
            }
        };
    }
})(angular);
