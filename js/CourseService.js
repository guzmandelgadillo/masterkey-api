(function (angular) {
    'use strict';
    angular.module('masterkey.api')
      .factory('courseService', ["futureObjectService", courseService]);
    function courseService(futureService) {
        function getCourse(courseId) {
            var url = "course/" + courseId;
            return futureService.getFutureSingleObject(url);
        }

        function getCourseVariant(courseId, courseVariantId) {
            var url = "agency/course/" + courseId + "/courseVariant/" + courseVariantId;
            return futureService.getFutureSingleObject(url);
        }

        function getPlace(placeId, placeType) {
            var url = "agency/place/" + placeType.toLowerCase() + "/" + placeId;
            return futureService.getFutureSingleObject(url);
        }

        function listByCourseVariant(courseVariantId) {
            var url = "agency/courseVariant/" + courseVariantId + "/courseEvent"
            return futureService.getFuturePagedObject(url);
        }

        function listByPlaceAndCourseType(place, courseType, params) {
            var max = 750;
            var url = "agency/course/" + courseType;
            var filters = angular.extend({ max: max }, params);
            filters[place.type] = place.id;

            return futureService.getFuturePagedObject(url, filters);
        }

        function listOptionalPromotion(courseId) {
            var url = "agency/course/1/agencyPromotion";
            return futureService.getFuturePagedObject(url);
        }

        function queryByCourseType(search, courseType) {
            var url = "agency/place/" + courseType;
            var params = { "q": search };

            return futureService.getFuturePagedObject(url, params);
        }

        function setQuoteDataScope(scope) {
            if (!scope) return;

        }

        return {
            getCourse: getCourse,
            getCourseVariant: getCourseVariant,
            getPlace: getPlace,
            listByCourseVariant: listByCourseVariant,
            listByPlaceAndCourseType: listByPlaceAndCourseType,
            listOptionalPromotion: listOptionalPromotion,
            queryByCourseType: queryByCourseType,
            setQuoteDataScope: setQuoteDataScope
        };
    };
})(angular);

  