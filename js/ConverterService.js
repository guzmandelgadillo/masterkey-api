(function() { 'use strict';

var app = angular.module('masterkey.api');

/**
 * Service to convert an object into another using a
 * user defined functions.
 */
app.service('converterService', function(){
  
  function ConverterService(){}
  
  /**
   * List of default filters of th converter service
   */
  var filters = {

    /**
     * Return the id of a given object, useful to send 
     * a list 
     * @param  {Object} val 
     * @return {Mixed} id value of the object
     */
    id: function id(val){
        if (val) { return val.id; }
    },

    /**
     * Definition used to get the value of another property
     * of the object.
     *
     * e.g. if 
     * @param  {String} property 
     * @return {Function}          
     */
    alias: function alias(property){

      /**
       * returned function that will return the value of the given
       * property
       * @param  {Object} obj to be converted
       * @return {Mixed}     
       */
      return function(val, obj){
        return obj[property];
      };

    },

    /**
     * Wrapper function that allows returning the given value
     * 
     * @param  {Mixed} val 
     * @return {Function}     
     */
    defaultValue: function(defaultValue){

      /**
       * Function that will return the value of the parent function
       * @return {Mixed}
       */
      return function(val){ 
        return (val === null || val === undefined) ? defaultValue  : val;
      };
    },

    /**
     * Filter that map the given value into a different
     * value taken from the object given
     *
     * @param  {Object<String, Mixed} Object to map all propertuies that will be converted 
     * @return {Function}
     */
     map: function map(mapper){

      /**
       * Function taht will take the value to find the
       * key in the object and return its value.
       * If a key is not found, then null is returned
       * 
       * @param  {String} val 
       * @return {Mixed} 
       */
      return function(val){
        return mapper.hasOwnProperty(val) ? mapper[val] : null;
      };
    },

    /**
     * Function to preserve the same value, should
     * be used when no modifications are required
     * 
     * @return {Function} 
     */
    eq: function eq(val){
      return val;
    },

    /**
     * Return a value that is greater or equal to the min value given
     * Even if the real valid is lower
     * @param {Integer} 
     * @return {Function} 
     */
    min: function min(minValue){

      /**
       * Return the minValue if the params is lower itherwise
       * the real value is returned
       * @param  {Integer} val 
       * @return {Integer}     
       */
      return function(val){
        return val < minValue ? minValue : val;
      };
    },

    /**
     * Return a value that is lower or equal to the max value given
     * Even if the real valid is greater
     * 
     * @param {Integer} 
     * @return {Function} 
     */
    max: function max(maxValue){

      /**
       * Return the maxValue if the params is lower itherwise
       * the real value is returned
       * @param  {Integer} val 
       * @return {Integer}     
       */
      return function(val){
        return val > maxValue ? maxValue : val;
      };
    },

    /**
     * Return a new compiler for the given object,
     * allows inheritance
     * @param  {Object<String, Function>} dls
     * @return {Function}       
     */
    embed: function(dsl){

      var format = new ConverterService().compile(dsl);

      /**
       * Compile and object or a collection using the dsl
       */
      return function embed(data){
        var isArray = angular.isArray(data);

        return isArray ? _.map(data, format) : format(data);
      };
    },

    /**
     * Opposite of id, takes a single element and wraps inside
     * and object, assigning the current value to the property
     * @param  {[type]} property [description]
     * @return {[type]}          [description]
     */
    wrap: function(property){
      
      return function wrap(data){
        var val = {};
        val[property] = data;

        if (data) { return val; }
      };
    }
  };

  /**
   * Create a function that will use all definitions
   * to generate a new object
   * 
   * Returned function should be used inside objects, since
   * this is a low level service, example:
   *
   *   var converter = converterService.compile(definition)
   *   Command.prototype.convert = function(){ converter(this) }
   *
   *another example used inside constructor
   *
   *   var conveter = converterService.compile(definition)
   *   function Command(params){
   *     angular.extend(this, converter(params));
   *   }
   * 
   * @param  {Object<String, Function|Array<Function>}
   * @return {Function}            
   */
  ConverterService.prototype.compile = function(dsl){

    if(!dsl || !angular.isObject(dsl)){
      throw new Error('DSL can be compiled, invalid argument: ' + dsl);
    }

    /**
     * Function that will take a list of functions that will be
     * applied to the property of the given object
     *
     * It is not a validator, even though some filters adjust the value
     * the converter will always be a returned value
     * 
     * @param  {Array<Function>|Function} definition 
     * @param  {Object} obj        
     * @param  {String} property   
     * @return {Mixed}            
     */
    function convert(definition, obj, property){
      // Normalize to arrays
      definition = angular.isArray(definition) ? definition : [definition];

      // Initial value is the object property
      var initialValue = obj[property];

      return _.reduce(definition, function(val, d){

        // Assert definition is a function
        if(!angular.isFunction(d)){
          throw new Error(d+' is not a function, property cannot be converted'+property);
        }

        return d(val, obj, property);

        // var value = d(val, obj, property);
        // Return undefined if key doesn't have any value
        // return (value === null || value === undefined) ? undefined  : value;

      }, initialValue);
    }

    /**
     * Convert the given object into a a new object 
     * using all transformations in dsl params
     * 
     * @param {Object} object
     * @return {Object}
     */
    return function Converter(obj){

      var properties = Object.keys(dsl);

      return _.reduce(properties, function(result, prop){
        result[prop] = convert(dsl[prop], obj, prop);
        return result;
      }, {});
    };
  };

  /**
   * Method to get default filters
   * 
   * @return {Object} 
   */
  ConverterService.prototype.getDefaultFilters = function () { return filters; };

  return new ConverterService();
});

})();