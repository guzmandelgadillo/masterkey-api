(function (angular) {
    'use strict';

    angular.module('masterkey.api')

      /**
       * Factory used to hold all necesary information to request a draft
       */
      .factory('DraftCommand', function () {

          function DraftCommand(course, courseVariant, courseEvent) {

              /**
               * Course used to generate the quote
               */
              this.course = course;

              /**
               * CouorseLine is the main
               */
              this.courseLine = {
                  product: courseVariant,
                  event: courseEvent
              };

              /**
               * AssociatedServices are sotred in an object where the key is the
               * object id and the value is the command to add, remove and configure 
               * the service
               */
              this.associatedServiceLine = {};

              /**
               * List of selected promotions
               */
              this.agencyPromotionList = [];

          }


          /**
           * Add associatedServices if they are not already added
           * 
           * @param {Object<Integer, AssociatedServiceLineCommand>} associatedServiceLineCommand 
           */
          DraftCommand.prototype.addAssociatedService = function (associatedServiceLineCommand) {

              var keys = Object.keys(associatedServiceLineCommand);

              this.associatedServiceLine = _.reduce(keys, function (all, key) {

                  all[key] = all[key] || associatedServiceLineCommand[key];

                  return all;

              }, this.associatedServiceLine);
          };

          return DraftCommand;
      });
})(angular);


  