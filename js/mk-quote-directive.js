(function (angular) {
    angular.module("masterkey.api").directive("mkQuote", ["dataFile", "quoteService", "currencyService", quoteDirective]);
    function quoteDirective(paths, quoteService, currencyService) {
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
                scope.courseId = courseId;
                scope.courseVariantId = courseVariantId;
                quoteService.setQuoteDataScope(scope, courseId, courseVariantId);
            }

            scope.refreshDraft = function (cmd, qty) {
                if (qty)
                    scope.courseLine.qty = qty;
                quoteService.refreshDraft(cmd, scope);
            }

            scope.setTab = function (tab) {
                scope.activeTab = tab;
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

