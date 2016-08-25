(function (angular) {
    angular.module("masterkey.api").directive("mkQuote", ["dataFile", "quoteService", quoteDirective]);
    function quoteDirective(paths, quoteService) {
        // Template Url
        var templateUrl = paths.templatesPath + "mk-quote-template.html";

        // Linking directive to DOM
        function link(scope, elem, attrs) {
            // Updating user token
            paths.setAuthToken(scope.userToken);
            quoteService.setQuoteDataScope(scope, scope.courseId, scope.courseVariantId);

            scope.activeTab = 'course';

            scope.isActiveTab = function (tab) {
                return tab === scope.activeTab;
            }

            scope.refreshQuote = function (courseId, courseVariantId) {
            }

            scope.refreshDraft = function (cmd, qty) {
                scope.cmd = quoteService.refreshCommand(cmd, scope.options);
                scope.options = updateOptions(scope.cmd, scope.options);
                scope.courseLine.qty = qty;

                // Aquí falta insertar el objeto scope.cmd
            }

            scope.setTab = function (tab) {
                scope.activeTab = tab;
            }

            function updateOptions(cmd, options) {
                return quoteService.updateOptions(scope, cmd, options);
            }
        }

        return {
            link: link,
            templateUrl: templateUrl,
            scope: {
                courseId: "=mkCourse",
                courseVariantId: "=mkCourseVariant",
                userToken: "=mkUser"
            }
        }
    }
})(angular);

