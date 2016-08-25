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
