(function (angular) {
    angular.module('masterkey.api').directive('mkQuoteCourse', ['dataFile', quoteCourse]);
    function quoteCourse(paths) {
        return {
            templateUrl: paths.templatesPath + 'mk-quote-course.html'
        };
    }
})(angular);

