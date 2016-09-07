(function (angular) {
    'use strict';

    angular.module('masterkey.api').factory('futureObjectService',
        ["$http", "BackendPagination", "endpointService", futureService]);
    function futureService($http, BackendPagination, endpoints) {
        function getPromise(url, params, format) {
            return getFutureObject(url, params, format).$promise;
        }
        
        function getDataPromise(promise, format) {

            function getDelegate(format) {
                if (format === 'single') { return promiseSingle; }
                if (format === 'list') { return promiseOldArray; }
                return promiseListPaged;
            }

            function delegateError(error) {
                data.$resolved = true;
                data.$error = error ? (error.statusText || 'Error!') : 'Error!';
                return error;
            }

            var delegate = getDelegate(format);
            var data = getDatacontainer(format);
            data.$resolved = false;
            data.$promise = promise.then(delegate, delegateError);
            
            
            function promiseSingle(response) {
                angular.extend(data, response);
                data.$resolved = true;
                return data;
            }
            
            function promiseListPaged(response) {
                response.resourceList.forEach(function (item) {
                    data.push(item);
                });
                if (response.meta){
                    data.$meta = new BackendPagination(response);
                }
                data.$resolved = true;
                return data;
            }
            
            function promiseOldArray(response) {
                response.forEach(function (item) {
                    data.push(item);
                });
                data.$resolved = true;
                return data;
            }
            
            return data;
        }

        function getFutureObject(url, params, format) {
            return getDataPromise(endpoints.get(url, params), format);
        }
        
        function getFuturePagedObject(url, params) {
            return getFutureObject(url, params, 'listPaged');
        }

        function getFutureSingleObject(url, params) {
            return getFutureObject(url, params, "single");
        }
        
        function getDatacontainer(format) {
            if (format !== 'single'){ return [] }
            return {};
        }

        function postPromise(url, data, params) {
            return endpoints.post(url, data, params);
        }

        return {
            getDataPromise: getDataPromise,
            getFutureObject: getFutureObject,
            getFuturePagedObject: getFuturePagedObject,
            getFutureSingleObject: getFutureSingleObject,
            getPromise: getPromise,
            postPromise: postPromise
        };
    };
})(angular);

