(function (angular) {
    angular.module("masterkey.api").constant("configurations", {
        endpoint: {
            "authTenant": "dev",
            "authToken": "",
            "host": "dev.masterkeyeducation.com:8080",
            "protocol": "http",
            "urlbase": "masterkey/",
            "server": "agency/"
        },
        location: {
            "urlbase": "bower_components/",
            "home": "masterkey-api/",
            "data": "data/",
            "templates": "templates/"
        }
    });
})(angular);

