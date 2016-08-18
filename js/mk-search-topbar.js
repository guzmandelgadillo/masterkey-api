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

