(function (angular) {
    angular.module("masterkey.api").constant("configurations", {
        endpoint: {
            "authTenant": "dev",
            "authToken": "null",
            "host": "dev.masterkeyeducation.com:8080",
            "protocol": "http",
            "urlbase": "masterkey/",
            "server": "agency/"
        },
        location: {
            "urlbase": "/Scripts/",
            "home": "masterkey/",
            "data": "data/",
            "templates": "templates/"
        }
    });
})(angular);

