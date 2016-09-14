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
        };
    }
})(angular);

