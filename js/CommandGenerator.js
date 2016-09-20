(function(angular){ 'use strict';

var app = angular.module('masterkey.api');

/**
 * Los level service to create Command Objects
 */
app.service('commandGenerator', ["converterService", function(converterService){

  function CommandGenerator(){}

  function compile(dsl){
    return converterService.compile(dsl);
  }

  /**
   * Object to handle pagination from state and request
   */
  function PaginationCommand(meta, pageSize){
    angular.extend(this, meta);

    this.defaultPageSize = this.defaultPageSize || pageSize; 

    this.max = this.max || this.defaultPageSize;
    this.offset = this.offset || 0;

    // Page is only available when we have results
    if(!this.current){
      this.current = this.max ? (Math.ceil(this.offset / this.max) + 1) : 0;
    }

    this.total = this.totalCount ? Math.ceil(this.totalCount / this.max) : 0;
  }

  /**
   * Marshaller to return state or query date
   * @return {Object} 
   */
  PaginationCommand.prototype.getParams = function(){
    return {
      max: this.max || null,
      offset: (this.max * (this.current - 1)) || null
    };
  };

  /**
   * Wrapper to create a command from a staet
   * @param  {QueryCommand} QueryCommand 
   * @param  {Object} dsl          to be used with converterService
   * @return {Function}              
   */
  CommandGenerator.prototype.createFromState = function(QueryCommand, dsl){
    var marshal = compile(dsl);

    return function createFromState(params){
      var data = marshal(params);
      var page = new PaginationCommand(params, QueryCommand.pageSize);

      return new QueryCommand(data, page);
    };
  };

  /**
   * Wrapper function to convert a command object to stateParams
   * @param  {Object<String,Function>} dsl 
   * @return {Function}     
   */
  CommandGenerator.prototype.toStateParams = function(dsl){
    var marshal = compile(dsl);

    return function toStateParams(query){
      var data = marshal(query);
      var page = new PaginationCommand(query.page).getParams();

      return angular.extend(data, page);
    };
  };

  /**
   * Wrapper to bind request data and create a new QueryCommand
   * @param  {QueryCommand} QueryCommand 
   * @param  {Object<String,Function>} dsl 
   * @return {Function}
   */
  CommandGenerator.prototype.bindQuery = function(QueryCommand, dsl){
    var marshal = compile(dsl);

    return function(request){
      var data = marshal(request.query || request.meta.filter);
      var page = new PaginationCommand(request.meta, QueryCommand.pageSize);

      return new QueryCommand(data, page);
    };
  };

  /**
   * Qrapper to a function to convert a queryCommand into params
   * to be sent to server
   * @param  {Object<String, Function>} dsl 
   * @return {Function}     [description]
   */
  CommandGenerator.prototype.toQueryParams = function(dsl){
    var marshal = compile(dsl);

    return function toQueryParams(query){
      var data = marshal(query);
      var page = new PaginationCommand(query.page).getParams();

      return angular.extend(data, page);
    };
  };

  /**
   * Boilerplate to  Add Query methods to a command Object
   * @param {Object<String,Object} config 
   * @param {queryCommand} config 
   */
  CommandGenerator.prototype.addQueryMethods = function(QueryCommand, config){

    var self = this;
    var methods = {
      fromState: function(QueryCommand, dsl){
        QueryCommand.createFromState = self.createFromState(QueryCommand, dsl);

        return QueryCommand;
      },

      toState: function(QueryCommand, dsl){
        var toState = self.toStateParams(dsl);

        QueryCommand.prototype.toStateParams = function(){
          return toState(this);
        };

        return QueryCommand;
      },

      fromQuery: function(QueryCommand, dsl){
        QueryCommand.prototype.bindQuery = self.bindQuery(QueryCommand, dsl);

        return QueryCommand;
      },

      toQuery: function(QueryCommand, dsl){
        var toQuery = self.toQueryParams(dsl);

        QueryCommand.prototype.toQueryParams = function(){
          return toQuery(this);
        };

        return QueryCommand;
      }
    };

    //@TODO Filter keys

    // Add methods
    return _.reduce(Object.keys(config), function(cmd, key){
      return methods[key](cmd, config[key]);
    }, QueryCommand);
  };

  return new CommandGenerator();
}]);

})(angular);