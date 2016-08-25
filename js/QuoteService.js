(function (angular) {
    angular.module("masterkey.api").factory("quoteService", ["courseService", "DraftCommand", quoteService]);
    function quoteService(courseService, DraftCommand) {
        function setQuoteDataScope(scope, courseId, courseVariantId) {
            if (!scope) return;
            var courseData = courseService.getCourse(courseId);
            var variantData = courseService.getCourseVariant(courseId, courseVariantId);
            var eventlistData = courseService.listByCourseVariant(courseVariantId);
            var promotionlistData = courseService.listOptionalPromotion(courseId);
            courseData.$promise.then(responseCourseData);
            variantData.$promise.then(responseVariantData);
            eventlistData.$promise.then(responseEventlistData);
            
            // Initialize values
            scope.course = courseData;
            scope.courseVariant = variantData;
            scope.courseEventList = eventlistData;
            scope.optionalPromotionList = promotionlistData;
            scope.draft = {};
            scope.options = [];
            scope.localCurrency = null;
            scope.saveMode = "existing";
            scope.opportunity = {};
            scope.quote = {};
            scope.cmd = {
                courseLine: {
                    event: {}
                },
                associatedServiceLine: {},
                agencyPromotionList: promotionlistData
            };
            scope.courseLine = scope.cmd.courseLine;

            function responseCourseData(response) {
                scope.cmd.course = courseData;
                // Default data for new Sales
                scope.opportunity.courseType = courseData.type;
                scope.opportunity.isClientStudent = true;
                tryUpdateOptions(scope.cmd);
            }

            function responseVariantData(response) {
                scope.cmd.courseLine.product = variantData;
                tryUpdateOptions(scope.cmd);
            }

            function responseEventlistData(response) {
                scope.cmd.courseLine.event = eventlistData[0];
                tryUpdateOptions(scope.cmd);
            }

            function tryUpdateOptions(cmd) {
                if (courseData.$resolved && variantData.$resolved && eventlistData.$resolved)
                    scope.options = updateOptions(scope, cmd);
            }
        }

        function createCourseLineOptions(course, courseVariant, courseEvent, courseEventList) {
            var durations = [];
            if (courseEvent && courseEvent.duration && courseVariant && courseVariant.currentBasePrice) {
                durations = [
                  _.range(courseEvent.duration.min, courseEvent.duration.max + 1),
                  _.range(courseVariant.duration.min, courseVariant.duration.max + 1),

                  // Add currentBasePrice supported qty
                  courseVariant.currentBasePrice.supportedQty
                ];
            }

            return {
                product: _.filter(course.variant, function (v) {
                    return v.id !== courseVariant.id;
                }),
                event: courseEventList,

                // Calculate in service
                qty: _.intersection(durations[0], durations[1], durations[2])
            };
        }

        function refreshCommand(draftCommand, options) {
            return angular.extend(new DraftCommand(), draftCommand, {
                courseLine: updateCourseLine(draftCommand.courseLine, options),
                accommodationLine: updateAccommodationLine(draftCommand)
            });
        }

        function updateCourseLine(courseLine, options) {
            courseLine.qty = courseLine.qty || options.courseLine.qty[0];
            return courseLine;
        }

        function updateAccommodationLine(draftCommand) {
            var line = draftCommand.accommodationLine;

            if (line && line.product) {
                return angular.extend({}, line, {
                    qty: line.qty || draftCommand.courseLine.qty,
                    startDate: line.startDate || draftCommand.courseLine.event.start
                });
            }
        }

        function updateOptions(scope, cmd, options) {
            function getOption(key) {
                var defaultVal = { product: null };

                if (!options) { return defaultVal; }

                return options[key].product ? options[key] : defaultVal;
            }

            return {
                courseLine: createCourseLineOptions(
                    scope.course,
                    scope.courseVariant,
                    cmd.courseLine.event,
                    scope.courseEventList
                ),
                accommodationLine: getOption('accommodationLine'),
                associatedServiceLine: getOption('associatedServiceLine'),
                providerServiceLine: getOption('providerServiceLine')
            };
        }

        return {
            setQuoteDataScope: setQuoteDataScope,
            refreshCommand: refreshCommand,
            updateOptions: updateOptions
        };
    }
})(angular);

