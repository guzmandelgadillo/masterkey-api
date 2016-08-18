(function (angular) {
'use strict';
    
angular.module('masterkey.api')
    .factory('BackendPagination', function () {
        
        function PaginationService(res) {
            this.size = res.meta.max;
            this.total = res.meta.totalCount;
            this.offset = res.meta.offset;
            this.count = res.resourceList.length;
            this.page = Math.ceil(this.offset / this.size) + 1;
            this.pages = Math.ceil(this.total / this.size);
        }
        
        PaginationService.prototype.getMeta = function () {
            return {
                totalCount: this.total,
                max: this.size,
                offset: this.getOffset()
            };
        };
        
        PaginationService.prototype.getOffset = function () {
            return this.size * (this.page - 1);
        };
        
        return PaginationService;
    });
})(angular);
