(function (angular) {
    'use strict';
    angular.module("masterkey.api").factory("endpointService", ["$http", "configurations", endpointService]);
    function endpointService($http, configurations) {
        var settings = configurations.endpoint;
        var apiPath = settings.protocol + "://" + settings.host + "/" + settings.urlbase;

        function get(url, params) {
            var headers = getHeaders();
            var uri = apiPath + url;
            var config = {
                params: params,
                headers: headers
            };
            return $http.get(uri, config).then(function (response) { return response.data; });
        }

        function post(url, data, params) {
            var headers = getHeaders();
            var uri = apiPath + url;
            var config = {
                data: data,
                params: params,
                headers: headers
            };
            return $http.post(uri, data, config);
        }

        function getHeaders() {
            return {
                "X-Auth-Token": settings.authToken,
                "X-Auth-Tenant": settings.authTenant
            };
        }

        return {
            apiPath: apiPath,
            get: get,
            headers: getHeaders,
            post: post
        };
    }
})(angular);

