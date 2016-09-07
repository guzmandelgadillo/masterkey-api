(function (angular) {
    'use strict';

    angular.module('masterkey.api')
      .factory('Price', function () {

          /**
           * Utility class to manage prices in the app
           * @param {Float} amount   
           * @param {String} currency code
           */
          function Price(amount, currency) {
              this.amount = amount;
              this.currency = currency;
          }

          /**
           * Returns a new price with same currency and
           * and the new amount 
           * 
           * @param {Float} amount
           */
          Price.prototype.add = function (amount) {
              return new Price(this.amount + amount, this.currency);
          };

          return Price;
      })


      .factory('MultiCurrencyPrice', function () {
          /**
           * MulticurrencyPrice is a set of 
           * prices that can be exchange to generate
           * an estimated total
           * 
           * @param {Price} priceList 
           */
          function MultiCurrencyPrice(priceList, total) {

              this.priceList = priceList;
              this.total = total;

              Object.freeze(this);

          }

          return MultiCurrencyPrice;
      });
})(angular);
