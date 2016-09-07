(function (angular) {
    angular.module("masterkey.api").factory("lineCommand", lineCommand);
    function lineCommand() {
        function T(product) {
            this.added = false;
            this.product = product;
            this.qty = 1; //@TODO Add defautl qty inspecting product
        }

        T.prototype.add = function () {
            this.added = true;
        };

        T.prototype.remove = function () {
            this.added = false;
        };

        return T;
    }
})(angular);

