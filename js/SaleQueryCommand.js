(function(angular){ 'use strict';

var app = angular.module('masterkey.api');

/**
 * QueryCommadn to filter payments
 */
app.factory('SaleQueryCommand', ["converterService", "commandGenerator", function(converterService, commandGenerator){

  var allowedStatus = ['All', 'Pending', 'Active', 'Approved'];
  //var defaultStatus = 'All';
  var f = converterService.getDefaultFilters();

  /**
   * Commadn to generate queries
   * @param {String} type   
   * @param {Object} params 
   */
  function SaleQueryCommand(params, page){
    // Default status is pending
    angular.extend(this, params);
    this.page = page;
    // this.status = allowedStatus.indexOf(this.status) ? this.status : defaultStatus;
  }

  /**
   * Default pageSize
   */
  SaleQueryCommand.pageSize = 25;

  function withArray(it){
    return angular.isArray(it) ? it : [it];
  }

  return commandGenerator.addQueryMethods(SaleQueryCommand, {
    fromState: {
      q: f.eq,
      client: f.wrap('id'),
      distributor: f.wrap('id'),
      status: function(it){
        var array = withArray(it);
        return _.filter(array, function(st){
          return allowedStatus.indexOf(st) !== -1;
        });
      },
      interestLevel: f.eq,
      paymentStatus: f.eq,
      enrollmentStatus: f.eq
    },

    toState: {
      q: f.eq,
      client: f.id,
      distributor: f.id,
      status: f.eq,
      interestLevel: withArray,
      paymentStatus: f.eq,
      enrollmentStatus: f.eq
    },

    fromQuery: {
      q: f.eq,
      client: f.eq,

      // Work only with single distributor
      distributor: function (it) { return it ? it[0] : null; },
      
      // Take first value of status. ['Pending'] => 'Pending'
      status: f.eq,
      interestLevel: f.eq,
      paymentStatus: f.eq,
      enrollmentStatus: f.eq
    },

    toQuery: {
      q: f.eq,
      client: f.id,
      distributor: f.id,
      
      status: function(it){
        var filter = f.map({
          All: '',
          Pending: 'Pending',
          Active: 'Active',
          Approved: 'Approved'
        });

        return _.map(it, filter);
      },

      interestLevel: f.eq,
      paymentStatus: f.eq,
      enrollmentStatus: f.eq
    }
  });

}]);

})(angular);