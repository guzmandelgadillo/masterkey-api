(function (angular) {
    'use strict';

    angular.module('masterkey.api')

    /**
     * Factory to load CouorseType configuration
    */
    .factory('CourseType', ["dataFile", function (dataFile) {

        var
        file = 'courseType',
        defaultValues = {
            language: true,
            category: true,
            area: true
        };

        function CourseType(params) {
            angular.extend(this, params, defaultValues);
        }

        CourseType.get = function (type) {

            return CourseType.query().then(function (courseTypesList) {
                return _.find(courseTypesList, { value: type });
            });
        };

        /**
         * Load data from local server with the CourseType configuration
         * 
         * @return {Promise} 
         */
        CourseType.query = function () {
            return dataFile.loadSource(file).then(function (courseTypes) {
                return courseTypes.map(function (it) { return new CourseType(it); });
            });
        };

        return CourseType;
    }]);
})(angular);


