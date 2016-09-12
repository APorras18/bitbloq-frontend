'use strict';

/**
 * @ngdoc function
 * @name bitbloqApp.controller:ViewFinderCtrl
 * @description
 * # ViewFinderCtrl
 */
angular.module('bitbloqApp')
    .controller('ViewFinderCtrl', function($scope, $document) {
        console.log('ViewFinderCtrl');

        $scope.showLoading = true;

        $document.on('jspanelnormalized', function(event, id) {
            console.log('jspanelnormalized', id);
            if (id === 'viewFinder') {

            }
        });

        $scope.loadBoard = function() {
            console.log('load board');
            console.log($scope.componentsArray, $scope.code);

        };
    });