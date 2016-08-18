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

