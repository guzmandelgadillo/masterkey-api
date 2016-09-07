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

