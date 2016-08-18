(function (angular) {
    'use strict';
    angular.module('masterkey.api')
    .service('dataFile', ["$http", "configurations", function ($http, configurations) {

        var ext = '.json';
        var settings = configurations.location;
        var endpoint = configurations.endpoint;
        var server = endpoint.protocol + "://" + endpoint.host + "/";
        var dataPath = settings.urlbase + settings.home + settings.data;
        var templatesPath = settings.urlbase + settings.home + settings.templates;
        var imagesPath = server + "cdn/";

        function get(source, key) {
            return loadSource(source).then(function (data) {
                return key, data[key];
            });
        }

        function loadSource(source) {
            return $http.get(dataPath + source + ext, { cache: true })
                .then(function (response) { return response.data });
        }

        function setAuthToken(token) {
            configurations.endpoint.authToken = token;
        }

        return {
            dataPath: dataPath,
            get: get,
            imagesPath: imagesPath,
            loadSource: loadSource,
            setAuthToken: setAuthToken,
            templatesPath: templatesPath
        }
    }]);
})(angular);
