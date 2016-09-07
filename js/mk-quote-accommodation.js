(function (angular) {
    angular.module('masterkey.api').directive('mkQuoteAccommodation', ["dataFile", quoteAccommodation]);
    function quoteAccommodation(paths) {
        function link(scope, elem, attrs) {

            scope.datepicker = {
                isOpen: false
            };

            scope.toggle = function () {
                scope.datepicker.isOpen = true;
            };
        }

        return {
            link: link,
            templateUrl: paths.templatesPath + 'mk-quote-accommodation.html'
        };
    }
})(angular);
