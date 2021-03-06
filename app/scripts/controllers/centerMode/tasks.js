(function() {
    'use strict';
    /**
     * @ngdoc function
     * @name bitbloqApp.controller:TasksCtrl
     * @description
     * # TasksCtrl
     * Controller of the bitbloqApp
     */
        //QUE NO LLAMEIS TAREAS A LOS EJERCICIOS DE UN ALUMNO
        //QUE NO LLAMEIS TAREAS A LOS EJERCICIOS DE UN ALUMNO
        //QUE NO LLAMEIS TAREAS A LOS EJERCICIOS DE UN ALUMNO
        //by Jose
    angular.module('bitbloqApp')
        .controller('TasksCtrl', function($log, $scope, $rootScope, _, ngDialog, alertsService, centerModeApi, exerciseApi, centerModeService, $routeParams, $location, commonModals, $window, exerciseService, $q, moment) {
            $scope.tasks = [];
            $scope.pageno = 1;
            $scope.tasksCount = 0;
            $scope.itemsPerPage = 10;
            $scope.menuActive = {};
            $scope.pagination = {
                'tasks': {
                    'current': 1
                }
            };
            $scope.exerciseService = exerciseService;
            $scope.centerModeService = centerModeService;
            $scope.moment = moment;

            var currentModal,
                groupSelected;

            $scope.changeExerciseMenu = function(index) {
                var previousState;
                if ($scope.menuActive[index]) {
                    previousState = $scope.menuActive[index];
                } else {
                    previousState = false;
                }
                $scope.menuActive = {};
                $scope.menuActive[index] = !previousState;
            };

            $scope.getTasksPaginated = function(pageno) {
                _getTasksWithParams(pageno);
            };

            $scope.registerInGroup = function() {
                function confirmAction(accessId) {
                    centerModeApi.registerInGroup(accessId).then(function() {
                        currentModal.close();
                        _getGroups().then(function() {
                            _getMyTasks();
                        });

                    }).catch(function() {
                        modal.input.showError = true;
                    });
                }

                var modalOptions = $rootScope.$new(),
                    modal = _.extend(modalOptions, {
                        title: 'centerMode_student_registerInClass',
                        contentTemplate: 'views/modals/input.html',
                        mainText: 'centerMode_modal_registerInClassInfo',
                        modalInput: true,
                        secondaryText: false,
                        input: {
                            id: 'groupId',
                            name: 'groupId',
                            placeholder: 'centerMode_modal_classIdPlaceholder',
                            errorText: 'centerMode_modal_registerInGroup-error',
                            showError: false
                        },
                        confirmButton: 'centerMode_student_registerInClass',
                        condition: function() {
                            return this.input.value;
                        },
                        rejectButton: 'modal-button-cancel',
                        confirmAction: confirmAction,
                        modalButtons: true
                    });

                currentModal = ngDialog.open({
                    template: '/views/modals/modal.html',
                    className: 'modal--container modal--input modal--register-in-group',
                    scope: modalOptions

                });
            };

            $scope.getTasksInGroup = function(group) {
                if (group) {
                    groupSelected = group._id;
                }
                _getTasksWithParams();
            };

            function _init() {
                $scope.common.itsUserLoaded().then(function() {
                    centerModeService.setCenter();
                    _getGroups().then(function() {
                        _getMyTasks();
                    });
                }, function() {
                    $scope.common.setUser();
                    alertsService.add({
                        text: 'view-need-tobe-logged',
                        id: 'view-need-tobe-logged',
                        type: 'error'
                    });
                    $scope.common.goToLogin();
                });
            }

            function _getMyTasks() {
                if ($routeParams.page && $routeParams.group) {
                    groupSelected = $routeParams.group;
                    _getTasksWithParams($routeParams.page);
                    $scope.pagination.tasks.current = $routeParams.page;
                } else {
                    _getTasksWithParams($scope.pageno);
                }
            }

            function _getGroups() {
                var defered = $q.defer();
                centerModeApi.getGroups('student').then(function(response) {
                    $scope.groups = response.data;
                    $scope.groupArray = $scope.groups;
                    if ($scope.groupArray.length > 0) {
                        groupSelected = $scope.groupArray[0]._id;
                    }
                    defered.resolve();
                });

                return defered.promise;
            }

            function _getTasksWithParams(pageno) {
                if (groupSelected) {
                    exerciseApi.getMyTasksByGroup(groupSelected, {
                        'page': pageno,
                        'pageSize': $scope.itemsPerPage
                    }).then(function(response) {
                        response.data.tasks.forEach(function(task) {
                            if (task.status === 'pending' && exerciseService.getDatetime(task.endDate, true)) {
                                task.status = 'notDelivered';
                            }
                        });
                        $scope.tasksCount = response.data.count;
                        $scope.tasks = response.data.tasks;
                        $location.search({
                            'group': groupSelected,
                            'page': pageno
                        });
                    });
                } else {
                    $scope.tasks = [];
                }
            }

            _init();

            $scope.$watch('search.searchExercisesText', function(newValue, oldValue) {
                if (newValue !== oldValue && (oldValue || oldValue === '') || (!oldValue && newValue)) {
                    if (newValue || newValue === '') {
                        $scope.filterExercFisesParams.name = newValue;
                        if (newValue === '') {
                            $scope.filterExercisesParams = {};
                            $location.search('name', null);
                            $location.search('page', 1);
                        }
                        $scope.searchExercises();
                    } else {
                        delete $scope.filterExercisesParams.name;
                    }
                }
            });

        });
})();
