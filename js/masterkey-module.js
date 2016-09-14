(function () {
    'use strict';
    angular.module("masterkey.api", ["ngSanitize", "ui.select", "pascalprecht.translate", "checklist-model", "ui.bootstrap.tpls", "ui.bootstrap.datepickerPopup", "masterkey.locale"])
        .config(["$translateProvider", "locale", configure]);
    function configure($translateProvider, locale) {
        $translateProvider.useSanitizeValueStrategy('escape');
        $translateProvider.translations('es', locale.es);
        $translateProvider.translations('en', locale.en);
        $translateProvider.translations('pt', locale.pt);
        $translateProvider.preferredLanguage('en');
    }
})();
