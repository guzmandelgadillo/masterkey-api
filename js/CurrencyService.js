(function (angular) {
    'use strict';
    angular.module("masterkey.api").service("currencyService", ["endpointService", currencyService]);
    function currencyService(endpoints) {
        function T() { }
        var urlCurrencySrv = "catalog/currency/";
        var KEY = "currency";
        var rates = {};

        /**
         * Convert an amount using the rates and the code given
         *     
         * @param  {Integer} amount         
         * @param  {String} currencyCode 
         * @param  {Object<String, Float>} rates        
         * @return {Float}              converted price
         */
        T.prototype.convert = function (amount, currencyCode, rates) {
            var rate = rates[currencyCode];
            return amount / rate;
        };

        /**
         * Default currency is used when no currency is given
         */
        T.prototype.defaultCurrency = {
            currency: 'USD',
            currencyName: 'Dollar'
        };

        /**
         * Load exchangeCurrency
         * @return {Currency} 
         * 
         * @deprecated  use CurrencyService.convert instead
         */
        T.prototype.loadExchangeCurrency = function (code) {
            code = code || this.defaultCurrency.currency;
            return loadRates(code).then(function (rates) {
                return {
                    currency: code,
                    rates: rates
                };
            });
        };

        return new T();

        function loadRates(codeBase) {
            var url = urlCurrencySrv + codeBase;
            return endpoints.get(url).then(function (currency) {
                return saveRates(codeBase, currency.rates);
            });
        }

        /**
         * Save currency rates in memory
         * @param  {Currency} currency 
         * @param  {[type]} rates    [description]
         * @return {[type]}          [description]
         */
        function saveRates(base, rawRates) {
            rates[base] = _.reduce(rawRates, function (result, rate) {
                result[rate.currency] = rate.rate;
                return result;

            }, {});

            return rates[base];
        }
    }
})(angular);

