(function() {
    'use strict';
    /**
     * @ngdoc function
     * @name bitbloqApp.controller:CenterCtrl
     * @description
     * # CenterCtrl
     * Controller of the bitbloqApp
     */
    angular.module('bitbloqApp')
        .controller('ExercisesCtrl', function($log, $scope, $rootScope, _, ngDialog, alertsService, centerModeApi, exerciseApi, centerModeService, $routeParams, $location, commonModals, $window, exerciseService, $document, utils, $q) {
            $scope.exercises = [];
            $scope.menuActive = {};
            $scope.tasks = [];
            $scope.groups = [];
            $scope.urlType = $routeParams.child;
            $scope.pageno = 1;
            $scope.itemsPerPage = 10;
            $scope.filterExercisesParams = {};
            $scope.orderInstance = 'name';
            $scope.showMoreActions = false;
            $scope.sortArray = ['explore-sortby-recent', 'email', 'name', 'surname', 'centerMode_column_groups', 'centerMode_column_students'];
            $scope.taskSortArray = ['tasks-sortby-name-az', 'tasks-sortby-name-za', 'tasks-sortby-mark-high', 'tasks-sortby-mark-low'];
            $scope.taskStatusArray = ['tasks-status-all', 'tasks-status-not-delivered', 'tasks-status-not-corrected', 'tasks-status-corrected'];
            $scope.exercisesCount = 0;
            $scope.pagination = {
                'exercises': {
                    'current': 1
                },
                'tasks': {
                    'current': 1
                }
            };
            $scope.groupArray = {};
            $scope.exerciseService = exerciseService;
            $scope.centerModeService = centerModeService;

            var groupSelected;

            // option menu in exercise table
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

            $scope.assignToGroup = function(exercise) {
                centerModeApi.getGroupsByExercise(exercise._id).then(function(response) {
                    exerciseService.assignGroup(exercise, $scope.common.user._id, response.data).then(function() {
                        _getGroups(exercise._id).then(function() {
                            _getExercise(exercise._id);
                        });
                    });
                });
            };
            // Assign groups
            $scope.editGroups = function(exercise) {
                centerModeApi.getGroupsByExercise(exercise._id).then(function(response) {
                    exerciseService.assignGroup(exercise, $scope.common.user._id, response.data).then(function() {
                        _getGroups();
                        _getExercises();
                    });
                });
            };

            $scope.createExerciseCopy = function(exercise) {
                exerciseService.clone(exercise);
                localStorage.exercisesChange = true;
            };

            $scope.deleteExercise = function(exercise) {
                var currentModal,
                    confirmAction = function() {
                        var exerciseId;
                        if (exercise.exercise) {
                            exerciseId = exercise.exercise._id;
                        } else {
                            exerciseId = exercise._id;
                        }
                        exerciseApi.delete(exerciseId).then(function() {
                            _.remove($scope.exercises, exercise);
                            alertsService.add({
                                text: 'centerMode_alert_deleteExercise',
                                id: 'deleteTask',
                                type: 'ok',
                                time: 5000
                            });
                        }).catch(function() {
                            alertsService.add({
                                text: 'centerMode_alert_deleteExercise-error',
                                id: 'deleteTask',
                                type: 'ko'
                            });
                        });
                        currentModal.close();
                    },
                    parent = $rootScope,
                    modalOptions = parent.$new();
                _.extend(modalOptions, {
                    title: $scope.common.translate('deleteExercise_modal_title') + ': ' + exercise.name,
                    confirmButton: 'button_delete',
                    confirmAction: confirmAction,
                    rejectButton: 'modal-button-cancel',
                    contentTemplate: '/views/modals/information.html',
                    textContent: $scope.common.translate('deleteExercise_modal_information'),
                    secondaryContent: 'deleteExercise_modal_information-explain',
                    modalButtons: true
                });

                currentModal = ngDialog.open({
                    template: '/views/modals/modal.html',
                    className: 'modal--container modal--input',
                    scope: modalOptions
                });
            };

            $scope.saveUrl = function(newUrl) {
                $scope.common.lastUrl = $location.url();
                $location.url(newUrl);
            };

            $scope.getExercisesPaginated = function(pageno) {
                getTeacherExercisesPaginated(pageno, $scope.filterExercisesParams);
            };
            $scope.getTasksPaginated = function(pageno) {
                var queryParamsArray = getRequest(),
                    queryParams = queryParamsArray || {},
                    groupPage = pageno ? pageno : 1,
                    groupId;

                var pageParams = {
                    'page': groupPage
                };
                angular.extend(queryParams, pageParams);
                $log.debug('getPublicProjects', queryParams);

                groupId = groupSelected ? groupSelected._id : null;
                if (groupId) {
                    exerciseApi.getTasksByExerciseAndGroup($scope.exercise._id, groupId, queryParams).then(function(response) {
                        response.data.forEach(function(task) {
                            var taskId = task._id;
                            _.extend(task, task.student);
                            if (task.status === 'pending' && exerciseService.getDatetime(task.endDate, true)) {
                                task.status = 'notDelivered';
                            }
                            task._id = taskId;
                        });
                        _getTasksByExerciseCount($routeParams.id, queryParams);
                        $scope.tasks = response.data;
                        $location.search('page', pageno);
                    });
                }
            };

            $scope.sortInstances = function(type) {
                $log.debug('sortInstances', type);
                switch (type) {
                    case 'explore-sortby-recent':
                        $scope.orderInstance = 'createdAt';
                        $scope.reverseOrder = true;
                        break;
                    case 'email':
                        $scope.orderInstance = 'email';
                        $scope.reverseOrder = false;
                        break;
                    case 'name':
                        $scope.orderInstance = 'firstName';
                        $scope.reverseOrder = false;
                        break;
                    case 'surname':
                        $scope.orderInstance = 'lastName';
                        $scope.reverseOrder = false;
                        break;
                    case 'centerMode_column_groups':
                        $scope.orderInstance = 'groups';
                        $scope.reverseOrder = false;
                        break;
                    case 'centerMode_column_students':
                        $scope.orderInstance = 'students';
                        $scope.reverseOrder = false;
                        break;
                }
            };

            $scope.renameExercise = function(exercise) {
                commonModals.rename(exercise, 'exercise').then(function() {
                    exerciseApi.update(exercise._id, exercise);
                });
            };

            $scope.searchExercises = function() {
                $location.search($scope.filterExercisesParams);
                getTeacherExercisesPaginated($scope.pageno, $scope.filterExercisesParams);
                _getExercisesCount($scope.filterExercisesParams);
            };

            $scope.setMoreOptions = function() {
                $scope.showMoreActions = !$scope.showMoreActions;
            };

            $scope.getTasksByGroup = function(group) {
                groupSelected = group;
                $scope.getTasksPaginated($scope.pageno);
            };

            $scope.sortTasks = function(option) {
                $scope.sortSelected = option;
                $scope.getTasksPaginated($scope.pageno);
            };

            $scope.filterTasksByStatus = function(option) {
                $scope.taskStatusSelected = option;
                $scope.getTasksPaginated($scope.pageno);
            };

            function _init() {
                $scope.common.itsUserLoaded().then(function() {
                    $scope.common.itsRoleLoaded().then(function() {
                        switch ($scope.common.userRole) {
                            case 'headmaster':
                            case 'teacher':
                                _checkUrl();
                                break;
                            default:
                                $location.path('/projects');
                        }
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

            //ok
            function _checkUrl() {
                centerModeApi.getMyCenter().then(function(response) {
                    centerModeService.setCenter(response.data);
                    _getExercisesCount();
                    _getGroups();
                    _getExercises();
                });
            }

            function _getExercise(exerciseId) {
                exerciseApi.get(exerciseId).then(function(response) {
                    $scope.exercise = response.data;
                    _getTasksByExercise();
                });
            }

            function _getExercisesCount(searchText) {
                var searchParams = searchText ? searchText : ($routeParams.name ? {
                    'name': $routeParams.name
                } : '');
                centerModeApi.getExercisesCount(null, searchParams).then(function(response) {
                    $scope.exercisesCount = response.data.count;
                });
            }

            function _getGroups(exerciseId) {
                var defered = $q.defer();
                if (exerciseId) {
                    centerModeApi.getGroupsByExercise(exerciseId).then(function(response) {
                        $scope.groups = response.data;
                        $scope.groupArray = $scope.groups;
                        groupSelected = $scope.groups[0];
                        defered.resolve();
                    });
                } else {
                    centerModeApi.getGroups('teacher', null, centerModeService.center._id).then(function(response) {
                        $scope.groups = response.data;
                        $scope.groupArray = $scope.groups;
                        defered.resolve();
                    });
                }

                return defered.promise;
            }

            function _getTasksByExercise() {
                if ($routeParams.page) {
                    $scope.getTasksPaginated($routeParams.page);
                    $scope.pagination.tasks.current = $routeParams.page;
                } else {
                    $scope.getTasksPaginated($scope.pageno);
                }
            }

            function _getTasksByExerciseCount(exerciseId, params) {
                var groupId = groupSelected ? groupSelected._id : null;
                if (groupId) {
                    exerciseApi.getTasksByExerciseAndGroupCount(exerciseId, groupId, params).then(function(response) {
                        $scope.tasksCount = response.data.count;
                    });
                }
            }

            function _getExercises() {
                var searchParams;
                searchParams = $routeParams.name ? $routeParams.name : '';
                if (searchParams) {
                    $scope.showFilters = true;
                    $scope.search.searchExercisesText = searchParams;
                }
                if ($routeParams.page) {
                    getTeacherExercisesPaginated($routeParams.page, {
                        'name': searchParams
                    });
                    $scope.pagination.exercises.current = $routeParams.page;
                } else {
                    getTeacherExercisesPaginated($scope.pageno);
                }
            }

            function getTeacherExercisesPaginated(pageno, search) {
                centerModeApi.getExercises(null, {
                    'page': pageno,
                    'pageSize': $scope.itemsPerPage,
                    'searchParams': search
                }).then(function(response) {
                    $scope.exercises = response.data;
                    _.forEach($scope.exercises, function(exercise) {
                        centerModeApi.getGroupsByExercise(exercise._id).then(function(response) {
                            exercise.groups = response.data;
                            var groups = _.map(response.data, 'name');
                            exercise.groups = groups.join(', ');
                        });
                    });
                    $location.search('page', pageno);
                });
            }

            //ok
            $window.onfocus = function() {
                $scope.$apply(function() {
                    $scope.timestamp = Date.now();
                });
                if (localStorage.exercisesChange && JSON.parse(localStorage.exercisesChange) && $scope.common.itsUserLoaded()) {
                    localStorage.exercisesChange = false;
                    _checkUrl();
                }
            };

            function getRequest() {
                var queryParams = {},
                    sortParams = getSortRequest(),
                    statusParams = getStatusRequest();

                queryParams = _.extend(queryParams, sortParams);
                queryParams = _.extend(queryParams, statusParams);

                return queryParams;
            }

            function getSortRequest() {
                var queryParams = {};
                switch ($scope.sortSelected) {
                    case 'tasks-sortby-name-az':
                        queryParams.sortParams = {
                            'name': 'asc'
                        };
                        break;
                    case 'tasks-sortby-name-za':
                        queryParams.sortParams = {
                            'name': 'desc'
                        };
                        break;
                    case 'tasks-sortby-mark-high':
                        queryParams.sortParams = {
                            'mark': 'desc'
                        };
                        break;
                    case 'tasks-sortby-mark-low':
                        queryParams.sortParams = {
                            'mark': 'asc'
                        };
                        break;

                    default:
                        queryParams.sortParams = {
                            'name': 'asc'
                        };
                        break;
                }

                return queryParams;
            }

            function getStatusRequest() {
                var queryParams = {};

                switch ($scope.taskStatusSelected) {
                    case 'tasks-status-not-delivered':
                        queryParams.statusParams = {
                            'status': 'pending'
                        };
                        break;
                    case 'tasks-status-not-corrected':
                        queryParams.statusParams = {
                            'status': 'delivered'
                        };
                        break;
                    case 'tasks-status-corrected':
                        queryParams.statusParams = {
                            'status': 'corrected'
                        };
                        break;
                }

                return queryParams;
            }

            _init();
        });
})();
