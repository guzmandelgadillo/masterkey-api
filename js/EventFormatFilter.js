(function (angular) {
    'use strict';

    angular.module('masterkey.api')

        /**
         * Filter to format evetn, uses date and translate
         */
        .filter('eventFormat', ["$filter", function ($filter) {
            return function EventFilter(event) {
                var
                start = $filter('date')(event.start, 'fullDate'),
                duration = (event.duration) ? $filter('translate')('event.duration.' + event.duration.term, event.duration) : '';

                return start + ' [' + duration + ']';
            };
        }]);
})(angular);

