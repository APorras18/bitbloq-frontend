'use strict';

/**
 * @ngdoc function
 * @name bitbloqApp.controller:LandingCtrl
 * @description
 * # LandingCtrl
 * Controller of the bitbloqApp
 */

angular.module('bitbloqApp')
    .controller('LandingCtrl', function($scope, $log, $translate, envData, commonModals, projectApi, common) {

        function getOs() {
            if (navigator.platform.indexOf('Win') !== -1) {
                return 'Windows';
            } else if (navigator.platform.indexOf('Mac') !== -1) {
                return 'Mac';
            } else if (navigator.platform.indexOf('Linux') !== -1) {
                return 'Linux';
            } else {
                return 'Linux';
            }
        }

        function getLandingExampleProjects() {
            var params = {
                'api:query': [{
                    '_acl.ALL.permission': 'READ'
                }, {
                    '_acl.user:561fc9c4e4b0ef5f4cedf162.permission': 'ADMIN'
                }],
                'api:aggregation': {
                    '$count': '*'
                }
            };

            projectApi.getPublic(params).then(function(response) {
                $log.debug('diy account have ' + response.data.count + ' projects');
                delete params['api:aggregation'];
                params['api:pageSize'] = 3;
                var maxNumber = Math.floor(response.data.count / params['api:pageSize']);
                params['api:page'] = Math.floor(Math.random() * maxNumber);

                projectApi.getPublic(params).then(function(response) {
                    $log.debug('final response');
                    $scope.projects = response.data;
                    $scope.projectStats = {};
                    $log.debug(response);
                }, function(error) {
                    $log.debug('Dont work :( remove field');
                    $log.debug(error);
                });

            }, function(error) {
                $log.debug('Dont work :( remove field');
                $log.debug(error);
            });
        }

        $scope.closeMenu = function($event) {
            if ($scope.menuVisible && !angular.element($event.target).hasClass('icon-wrapper')) {
                $scope.toggleMenu();
            }
        };

        $scope.setTestimonial = function(index) {
            $scope.currentTestimonial = index;
        };
        $scope.toggleMenu = function() {
            $scope.menuVisible = !$scope.menuVisible;
        };

        //$scope.testimonials = ['Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc non urna non libero porttitor mollis. Vivamus ac lacus eu libero mollis pulvinar quis in lorem.Nam sollicitudin ligula facilisis, sagittis metus. Elit nunc non', 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus, accusamus cumque iure exercitationem, dicta velit. Nostrum quod recusandae, fugit maiores?', 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Error, maxime.', 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nesciunt, illo. Laudantium nemo, porro magnam corporis ad!'];
        $scope.currentTestimonial = 0;
        $scope.windowScroll = false;
        $scope.menuVisible = false;
        $scope.envData = envData;
        $scope.operatingSystem = getOs();
        $scope.commonModals = commonModals;
        $scope.projects = [];
        $scope.translate = $translate;

        var landingView = angular.element('.view--landing');

        landingView.on('scroll', function() {
            var targetScroll = this.scrollTop;
            var heightToScroll;
            if (common.oldVersionMasthead.status) {
                heightToScroll = 66;
            } else {
                heightToScroll = 30;
            }
            if (targetScroll > heightToScroll) {
                if (!$scope.windowScroll) {
                    $scope.windowScroll = true;
                    $scope.$apply();
                }
            } else {
                if ($scope.windowScroll) {
                    $scope.windowScroll = false;
                    $scope.$apply();
                }
            }
        });

        getLandingExampleProjects();
    });
