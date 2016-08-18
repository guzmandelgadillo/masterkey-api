(function (angular) {
    angular.module("masterkey.api").directive("mkQuoteAssociated", ["dataFile", quoteAssociated]);
    function quoteAssociated(paths) {
        // Template Url
        var templateUrl = paths.templatesPath + "mk-quote-associated.html";

        function link(scope, elem, attrs) {
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

