(function (angular) {
    'use strict';
    angular.module('masterkey.api')
      .factory('courseService', ["futureObjectService", courseService]);
    function courseService(futureService) {
        var variantLoadedProperty = '$courseVariantLoaded';
        function addToCourseList(courseVariantList, courseList) {
            var courses = _.reduce(courseVariantList, function (courses, variant) {
                var course = _.find(courses, { id: variant.courseId });

                // Inititalize courseVariant
                if (course && !course[variantLoadedProperty]) {
                    course.courseVariant = course.courseVariant || [];
                    course.courseVariant.push(variant);
                }

                return courses;

            }, courseList);


            return _.map(courses, function (course) {
                course[variantLoadedProperty] = true;
                return course;
            });
        }

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

        function findAllAssociatedByCourse(courseId) {
            var url = 'agency/associatedService';
            var params = { course: courseId };
            return futureService.getFuturePagedObject(url, params);
        }

        function findAllProvidedByCourse(courseId) {
            var url = 'providerService';
            var params = { course: courseId };
            return futureService.getFuturePagedObject(url, params);
        }

        function listAccommodationByCourse(courseId) {
            var url = 'agency/course/' + courseId + '/accommodation';
            return futureService.getFuturePagedObject(url);
        }

        function listByCourse(courseIds) {
            var
            url = 'agency/courseVariant/course',
            params = { 'course': courseIds };

            return futureService.getFuturePagedObject(url, params);
        }

        function listByCourseVariant(courseVariantId) {
            var url = "agency/courseVariant/" + courseVariantId + "/courseEvent";
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
            var url = "agency/course/" + courseId + "/agencyPromotion";
            return futureService.getFuturePagedObject(url);
        }

        function listSales(query) {
            var url = "agency/sale";
            return futureService.getFuturePagedObject(url, query);
        }

        function loadAndBindToCourseList(courseList) {
            var
            addTo = addToCourseList,
            courses = _.filter(courseList, function (course) {
                return course[variantLoadedProperty] !== true;
            });

            if (!courses.length) { return courseList; }
            var variantsList = listByCourse(_.map(courses, function (item) { return item.id; }));
            return variantsList.$promise.then(function (courseVariantList) {
                return addTo(variantsList, courses);
            });
        }

        function postCreateDraft(draft) {
            var url = "agency/draft/";
            return futureService.postPromise(url, draft);
        }

        function postCreateSale(data) {
            var url = "agency/sale/";
            return futureService.postPromise(url, data);
        }

        function postCreateQuote(saleId, data) {
            var url = "agency/sale/" + saleId + "/quote";
            return futureService.postPromise(url, data);
        }

        function queryByCourseType(search, courseType) {
            var url = "agency/place/" + courseType;
            var params = { "q": search };

            return futureService.getFuturePagedObject(url, params);
        }

        return {
            findAllAssociatedByCourse: findAllAssociatedByCourse,
            findAllProvidedByCourse: findAllProvidedByCourse,
            getCourse: getCourse,
            getCourseVariant: getCourseVariant,
            getPlace: getPlace,
            listAccommodationByCourse: listAccommodationByCourse,
            listByCourseVariant: listByCourseVariant,
            listByPlaceAndCourseType: listByPlaceAndCourseType,
            listOptionalPromotion: listOptionalPromotion,
            listSales: listSales,
            loadAndBindToCourseList: loadAndBindToCourseList,
            postCreateDraft: postCreateDraft,
            postCreateQuote: postCreateQuote,
            postCreateSale: postCreateSale,
            queryByCourseType: queryByCourseType
        };
    }
})(angular);

  