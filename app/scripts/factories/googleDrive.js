'use strict';
angular.module('bitbloqApp')
    .factory('googleDrive', function(gapi, $window) {
        gapi.client.load('drive', 'v3', function() {
            return $window.bloqs;
        });
    });