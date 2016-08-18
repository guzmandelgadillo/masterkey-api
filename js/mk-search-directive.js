(function(angular) {
    angular.module("masterkey.api").directive('mkSearch', ["courseService", "dataFile", searchDirective]);

    function searchDirective(courseService, paths) {
        // Template Url
        var templateUrl = paths.templatesPath + "mk-search-template.html";

        function link(scope, elem, attrs) {
            // Updating user token
            paths.setAuthToken(scope.userToken);

            // Filtering list of courses
            scope.filterCourses = function () {
                var filter = {};
                _.forIn(query, function (value, key) {
                    if (value)
                        query[key] = value;
                });
                scope.courseList = _.filter(scope.unfilteredList, query);
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

            // Filtering options of filters
            function refreshOptionsList(courseList) {
                var options = {
                    cityList: 'institute.city',
                    countryList: 'institute.city.country',
                    schoolList: 'institute.school',
                    categoryList: 'category'
                };

                scope.options = {};
                _.forIn(options, function (value, key) {
                    var temp = _.uniqBy(courseList, value);
                    scope.options[key] = _.map(temp, function (item) {
                        return item[value];
                    });
                    scope.options[key] = _.compact(scope.options[key]);
                });
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
