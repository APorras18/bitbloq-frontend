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
        .controller('CenterCtrl', function($log, $scope, $rootScope, _, ngDialog, alertsService, centerModeApi, exerciseApi, centerModeService, $routeParams, $location, commonModals, $window, exerciseService, $document, utils) {
            $scope.center = {}; // when user is headmaster
            $scope.exercises = [];
            $scope.group = {};
            $scope.groups = [];
            $scope.teacher = {};
            $scope.teachers = [];
            $scope.sortArray = ['explore-sortby-recent', 'email', 'name', 'surname', 'centerMode_column_groups', 'centerMode_column_students'];
            $scope.secondaryBreadcrumb = false;
            $scope.students = [];
            $scope.orderInstance = 'name';
            $scope.common.urlType = $routeParams.type;
            $scope.urlSubType = $routeParams.subtype;
            $scope.showMoreActions = false;
            $scope.pageno = 1;
            $scope.showFilters = false;
            $scope.exercisesCount = 0;
            $scope.itemsPerPage = 10;
            $scope.menuActive = {};
            $scope.search = {};
            $scope.filterExercisesParams = {};
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

            var currentModal;

            $scope.changeFilter = function() {
                $scope.showFilters = !$scope.showFilters;
            };

            $scope.editGroup = function() {
                exerciseService.assignGroup($scope.exercise, $scope.common.user._id, $scope.groups, $scope.center._id)
                    .then(function() {
                        _getTasksByExercise($routeParams.id);
                        _getGroups('teacher', $routeParams.id);
                    });
            };

            $scope.editGroups = function(exercise) {
                centerModeApi.getGroupsByExercise(exercise._id).then(function(response) {
                    exerciseService.assignGroup(exercise, $scope.common.user._id, response.data).then(function() {
                        _getGroups('teacher');
                    });
                });
            };

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

            $scope.changeStatusClass = function() {
                centerModeApi.updateGroup($scope.group).catch(function() {
                    alertsService.add({
                        text: 'updateGroup_alert_Error',
                        id: 'deleteGroup',
                        type: 'ko'
                    });
                });
            };

            $scope.closeGroup = function() {
                var parent = $rootScope,
                    modalOptions = parent.$new();
                _.extend(modalOptions, {
                    title: 'closeGroup_modal_title',
                    confirmButton: 'archiveGroup_modal_acceptButton',
                    confirmAction: _closeGroupAction,
                    rejectButton: 'modal-button-cancel',
                    textContent: 'closeGroup_modal_info',
                    contentTemplate: '/views/modals/information.html',
                    modalButtons: true
                });

                currentModal = ngDialog.open({
                    template: '/views/modals/modal.html',
                    className: 'modal--container modal--input',
                    scope: modalOptions
                });
            };

            $scope.createExerciseCopy = function(exercise) {
                exerciseService.clone(exercise);
                localStorage.exercisesChange = true;
            };

            $scope.deleteGroup = function() {
                var confirmAction = function() {
                        centerModeApi.deleteGroup($scope.group._id).then(function() {
                            alertsService.add({
                                text: 'centerMode_alert_deleteGroup',
                                id: 'deleteGroup',
                                type: 'ok',
                                time: 5000
                            });
                            $location.path('center-mode/teacher');
                        }).catch(function() {
                            alertsService.add({
                                text: 'centerMode_alert_deleteGroup-Error',
                                id: 'deleteGroup',
                                type: 'ko'
                            });
                        });
                        currentModal.close();
                    },
                    parent = $rootScope,
                    modalOptions = parent.$new();
                _.extend(modalOptions, {
                    title: 'deleteGroup_modal_title',
                    confirmButton: 'button_delete',
                    confirmAction: confirmAction,
                    rejectButton: 'modal-button-cancel',
                    contentTemplate: '/views/modals/centerMode/deleteGroup.html',
                    finishAction: $scope.closeGroup,
                    modalButtons: true
                });

                currentModal = ngDialog.open({
                    template: '/views/modals/modal.html',
                    className: 'modal--container modal--input modal--delete-group',
                    scope: modalOptions
                });
            };

            $scope.deleteTask = function(task) {
                var confirmAction = function() {
                        exerciseApi.deleteTask(task._id).then(function() {
                            _.remove($scope.tasks, task);
                            alertsService.add({
                                text: 'centerMode_alert_deleteTask',
                                id: 'deleteTask',
                                type: 'ok',
                                time: 5000
                            });
                        }).catch(function() {
                            alertsService.add({
                                text: 'centerMode_alert_deleteTask-error',
                                id: 'deleteTask',
                                type: 'ko'
                            });
                        });
                        currentModal.close();
                    },
                    parent = $rootScope,
                    modalOptions = parent.$new(),
                    student = $scope.student && $scope.student.firstName ? $scope.student.firstName + $scope.student.lastName : $scope.student.username;
                _.extend(modalOptions, {
                    title: $scope.common.translate('deleteTask_modal_title') + ': ' + task.name,
                    confirmButton: 'button_delete',
                    value: $scope.student.username,
                    confirmAction: confirmAction,
                    rejectButton: 'modal-button-cancel',
                    contentTemplate: '/views/modals/information.html',
                    textContent: $scope.common.translate('deleteTask_modal_information', {
                        value: student
                    }),
                    secondaryContent: 'deleteTask_modal_information-explain',
                    modalButtons: true
                });

                currentModal = ngDialog.open({
                    template: '/views/modals/modal.html',
                    className: 'modal--container modal--input',
                    scope: modalOptions
                });
            };

            $scope.deleteExerciseInGroup = function(exerciseId) {
                centerModeApi.unassignExerciseInGroup(exerciseId, $scope.group._id).then(function() {
                    _.remove($scope.exercises, function(n) {
                        return n._id === exerciseId;
                    });
                });

            };

            $scope.deleteExercise = function(exercise) {
                var confirmAction = function() {
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

            $scope.deleteTeacher = function(teacher) {
                var confirmAction = function() {
                        centerModeApi.deleteTeacher(teacher._id, $scope.center._id).then(function() {
                            _.remove($scope.teachers, teacher);
                            alertsService.add({
                                text: 'centerMode_alert_deleteTeacher',
                                id: 'deleteTeacher',
                                type: 'ok',
                                time: 5000
                            });
                        }).catch(function() {
                            alertsService.add({
                                text: 'centerMode_alert_deleteTeacher-Error',
                                id: 'deleteTeacher',
                                type: 'error'
                            });
                        });
                        teacherModal.close();
                    },
                    parent = $rootScope,
                    modalOptions = parent.$new();

                _.extend(modalOptions, {
                    title: 'deleteTeacher_modal_title',
                    confirmButton: 'button_delete ',
                    rejectButton: 'cancel',
                    confirmAction: confirmAction,
                    contentTemplate: '/views/modals/information.html',
                    textContent: 'deleteTeacher_modal_information',
                    secondaryContent: 'deleteTeacher_modal_information-explain',
                    modalButtons: true
                });

                var teacherModal = ngDialog.open({
                    template: '/views/modals/modal.html',
                    className: 'modal--container modal--input',
                    scope: modalOptions
                });
            };

            $scope.deleteStudent = function(student) {
                var confirmAction = function() {
                        centerModeApi.deleteStudent(student._id, $scope.group._id).then(function() {
                            alertsService.add({
                                text: 'centerMode_alert_deleteStudent',
                                id: 'deleteStudent',
                                type: 'ok',
                                time: 5000
                            });
                            $location.path('center-mode/group/' + $scope.group._id);
                        }).catch(function() {
                            alertsService.add({
                                text: 'centerMode_alert_deleteStudent-error',
                                id: 'deleteTStudent',
                                type: 'error'
                            });
                        });
                        studentModal.close();
                    },
                    parent = $rootScope,
                    modalOptions = parent.$new(),
                    studentName = $scope.student && $scope.student.firstName ? $scope.student.firstName + $scope.student.lastName : $scope.student.username;

                _.extend(modalOptions, {
                    title: 'deleteStudent_modal_title',
                    confirmButton: 'button_delete ',
                    rejectButton: 'cancel',
                    confirmAction: confirmAction,
                    contentTemplate: '/views/modals/information.html',
                    textContent: $scope.common.translate('deleteStudent_modal_information', {
                        value: studentName
                    }),
                    secondaryContent: 'deleteStudent_modal_information-explain',
                    modalButtons: true
                });

                var studentModal = ngDialog.open({
                    template: '/views/modals/modal.html',
                    className: 'modal--container modal--input',
                    scope: modalOptions
                });
            };

            // get Exercises paginated

            $scope.getExercisesPaginated = function(pageno) {
                switch ($scope.common.urlType) {
                    case 'teacher':
                    case 'center-teacher':
                        getTeacherExercisesPaginated(pageno, $scope.filterExercisesParams);
                        break;
                    case 'student':
                        getTasksWithParams(pageno);
                        break;
                }
            };

            function getTeacherExercisesPaginated(pageno, search) {

                centerModeApi.getExercises($scope.teacher._id, {
                    'page': pageno,
                    'pageSize': $scope.itemsPerPage,
                    'searchParams': search
                }).then(function(response) {
                    $scope.exercises = response.data;
                    $location.search('page', pageno);
                });
            }

            // getTasksPaginated
            $scope.getTasksPaginated = function(pageno) {
                exerciseApi.getTasksByExercise($scope.exercise._id, {
                    'page': pageno,
                    'pageSize': $scope.itemsPerPage
                }).then(function(response) {
                    response.data.forEach(function(task) {
                        var taskId = task._id;
                        _.extend(task, task.student);
                        if (task.status === 'pending' && exerciseService.getDatetime(task.endDate, true)) {
                            task.status = 'notDelivered';
                        }
                        task._id = taskId;
                    });
                    $scope.tasks = response.data;
                    $location.search('page', pageno);
                });
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

            $scope.sortInstancesByGroup = function() {

            };

            $scope.newGroup = function() {
                centerModeService.newGroup($scope.teacher._id || $scope.common.user._id, $scope.center._id)
                    .then(function() {
                        _getGroups('teacher');
                    });
            };

            $scope.newTeacher = function() {
                var confirmAction = function() {
                        var teachers = _.map(modalOptions.newTeachersModel, 'text');
                        if (teachers.length > 0) {
                            centerModeApi.addTeachers(teachers, $scope.center._id).then(function(response) {
                                if (response.data.teachersNotAdded) {
                                    commonModals.noAddTeachers(response.data.teachersNotAdded, response.data.teachersAdded.length);
                                }
                                if (response.data.teachersAdded) {
                                    _.forEach(response.data.teachersAdded, function(teacher) {
                                        $scope.teachers.push(teacher);
                                    });
                                }
                            }).catch(function() {
                                alertsService.add({
                                    text: 'centerMode_alert_addTeacher-Error',
                                    id: 'addTeacher',
                                    type: 'error'
                                });
                            });
                        }
                        newTeacherModal.close();
                    },
                    parent = $rootScope,
                    modalOptions = parent.$new();

                _.extend(modalOptions, {
                    title: 'newTeacher_modal_title',
                    confirmButton: 'newTeacher_modal_aceptButton',
                    confirmAction: confirmAction,
                    contentTemplate: '/views/modals/centerMode/newTeacher.html',
                    modalButtons: true,
                    newTeachersModel: []
                });

                var newTeacherModal = ngDialog.open({
                    template: '/views/modals/modal.html',
                    className: 'modal--container modal--input',
                    scope: modalOptions
                });
            };
            $scope.registerInGroup = function() {
                function confirmAction(accessId) {
                    centerModeApi.registerInGroup(accessId).then(function() {
                        currentModal.close();
                        _getGroups('student');
                        _getTasks();
                    }).catch(function() {
                        modal.input.showError = true;
                    });
                }

                var modalOptions = $rootScope.$new(),
                    modal = _.extend(modalOptions, {
                        title: 'centerMode_modal_registerInGroupTitle',
                        contentTemplate: 'views/modals/input.html',
                        mainText: 'centerMode_modal_registerInGroupInfo',
                        modalInput: true,
                        secondaryText: false,
                        input: {
                            id: 'groupId',
                            name: 'groupId',
                            placeholder: 'centerMode_modal_groupIdPlaceholder',
                            errorText: 'centerMode_modal_registerInGroup-error',
                            showError: false
                        },
                        confirmButton: 'centerMode_button_registerInGroup',
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

            $scope.renameExercise = function(exercise) {
                commonModals.rename(exercise, 'exercise').then(function() {
                    exerciseApi.update(exercise._id, exercise);
                });
            };

            $scope.saveUrl = function(newUrl) {
                $scope.common.lastUrl = $location.url();
                $location.url(newUrl);
            };

            function _checkUrl() {
                $scope.common.urlType = $routeParams.type;
                switch ($scope.common.urlType) {
                    case 'center':
                        _getCenter();
                        break;
                    case 'center-teacher':
                    case 'teacher':
                        $scope.center = {};
                        _getTeacher($routeParams.id);
                        break;
                    case 'group':
                        if ($scope.urlSubType && $scope.urlSubType === 'student') {
                            _getTasks($routeParams.id, $routeParams.subId);
                        } else {
                            _getGroup($routeParams.id);
                        }
                        break;
                    case 'student':
                        $scope.center = {};
                        _getGroups('student');
                        _getMyExercises();
                        break;
                    case 'exercise-info':
                        _getExercise($routeParams.id);
                        _getTasksByExerciseCount($routeParams.id);
                        _getGroups(null, $routeParams.id);
                        break;
                }
            }

            function _closeGroupAction() {
                $scope.classStateCheck = false;
                $scope.group.status = 'closed';
                centerModeApi.updateGroup($scope.group).then(function() {
                    alertsService.add({
                        text: 'centerMode_alert_closeGroup',
                        id: 'closeGroup',
                        type: 'ok',
                        time: 5000
                    });
                }).catch(function() {
                    alertsService.add({
                        text: 'centerMode_alert_closeGroup-Error',
                        id: 'closeGroup',
                        type: 'ko'
                    });
                });
                currentModal.close();
            }

            function _getCenter() {
                return centerModeApi.getMyCenter().then(function(response) {
                    $scope.center = response.data;
                    _getTeachers($scope.center._id);
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
                centerModeApi.getExercisesCount($scope.teacher._id, searchParams).then(function(response) {
                    $scope.exercisesCount = response.data.count;
                });
            }

            function _getGroup(groupId) {
                centerModeApi.getGroup(groupId).then(function(response) {
                    $scope.secondaryBreadcrumb = true;
                    $scope.group = response.data;
                    $scope.students = $scope.group.students;
                    $scope.exercises = $scope.group.exercises;
                    $scope.classStateCheck = $scope.group.status === 'open';
                });
            }

            function _getGroups(role, exerciseId) {
                if (exerciseId) {
                    centerModeApi.getGroupsByExercise(exerciseId).then(function(response) {
                        $scope.groups = response.data;
                        $scope.groupArray = $scope.groups;
                    });
                } else {
                    var teacherId;
                    if ($scope.teacher._id !== $scope.common.user._id) {
                        teacherId = $scope.teacher._id; // if user is student, it will be undefined
                    }
                    centerModeApi.getGroups(role, teacherId, $scope.center._id).then(function(response) {
                        $scope.groups = response.data;
                        $scope.groupArray = $scope.groups;
                    });
                }

            }

            function _getTasks(groupId, studentId, pageno) {
                exerciseApi.getTasks(groupId, studentId, {
                    'page': pageno,
                    'pageSize': $scope.itemsPerPage
                }).then(function(response) {
                    $scope.exercises = response.data;
                    if ($scope.urlSubType === 'student') {
                        $scope.exercises.tasks.forEach(function(task) {
                            if (task.status === 'pending' && exerciseService.getDatetime(task.endDate, true)) {
                                task.status = 'notDelivered';
                            }
                        });
                        $scope.tertiaryBreadcrumb = true;
                        $scope.tasks = response.data.tasks;
                        $scope.group = response.data.group;
                        $scope.student = response.data.student;
                    }
                });
            }

            function getTasksWithParams(pageno) {
                exerciseApi.getTasks(null, null, {
                    'page': pageno,
                    'pageSize': $scope.itemsPerPage
                }).then(function(response) {
                    response.data.forEach(function(task) {
                        if (task.status === 'pending' && exerciseService.getDatetime(task.endDate, true)) {
                            task.status = 'notDelivered';
                        }
                    });
                    $scope.exercises = response.data;
                    $location.search('page', pageno);
                });
            }

            function _getMyExercisesCount() {
                exerciseApi.getTasksCount().then(function(response) {
                    $scope.exercisesCount = response.data.count;
                });
            }

            function _getMyExercises() {
                _getMyExercisesCount();
                if ($routeParams.page) {
                    getTasksWithParams($routeParams.page);
                    $scope.pagination.exercises.current = $routeParams.page;
                } else {
                    getTasksWithParams($scope.pageno);
                }
            }

            function _getTasksByExercise() {
                if ($routeParams.page) {
                    $scope.getTasksPaginated($routeParams.page);
                    $scope.pagination.tasks.current = $routeParams.page;
                } else {
                    $scope.getTasksPaginated($scope.pageno);
                }
            }

            function _getTasksByExerciseCount(exerciseId) {
                exerciseApi.getTasksByExerciseCount(exerciseId).then(function(response) {
                    $scope.tasksCount = response.data.count;
                });
            }

            function _getTeacher(teacherId) {
                if (teacherId) {
                    // user is headmaster
                    centerModeApi.getMyCenter().then(function(response) {
                        $scope.center = response.data;
                        centerModeApi.getTeacher(teacherId, $scope.center._id).then(function(response) {
                            $scope.secondaryBreadcrumb = true;
                            $scope.teacher = _.extend($scope.teacher, response.data);
                            _getExercisesCount();
                            _getGroups('teacher');
                            _getExercises();
                        });
                    });
                } else {
                    $scope.secondaryBreadcrumb = true;
                    _getExercisesCount();
                    _getGroups('teacher');
                    _getExercises();
                }
            }

            function _getTeachers(centerId) {
                centerModeApi.getTeachers(centerId).then(function(response) {
                    $scope.teachers = response.data;
                });
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

            $scope.setMoreOptions = function() {
                $scope.showMoreActions = !$scope.showMoreActions;
            };

            function clickDocumentHandler(evt) {
                switch ($scope.common.urlType) {
                    case 'exercise-info':
                        if (!angular.element(evt.target).hasClass('btn--showMoreActions')) {
                            $scope.showMoreActions = false;
                            utils.apply($scope);
                        }
                        break;
                    case 'teacher':
                        if (!$(evt.target).hasClass('btn--center-mode--table')) {
                            $scope.menuActive = {};
                            utils.apply($scope);
                        }
                        break;

                }
            }

            $window.onfocus = function() {
                if ($routeParams.type === 'teacher') {
                    $scope.$apply(function() {
                        $scope.timestamp = Date.now();
                    });
                    if (localStorage.exercisesChange && JSON.parse(localStorage.exercisesChange) && $scope.common.itsUserLoaded()) {
                        localStorage.exercisesChange = false;
                        _checkUrl();
                    }
                }
            };

            $scope.common.itsUserLoaded().then(function() {
                $scope.common.itsRoleLoaded().then(function() {
                    switch ($scope.common.userRole) {
                        case 'headmaster':
                        case 'teacher':
                        case 'student':
                            _checkUrl();
                            break;
                        default:
                            $location.path('/projects');
                    }
                });
            }, function() {
                $scope.common.setUser();
                alertsService.add({
                    text: 'projects-need-tobe-logged',
                    id: 'projects-need-tobe-logged',
                    type: 'error'
                });
                $location.path('/login');
            });

            $scope.searchExercises = function() {
                $location.search($scope.filterExercisesParams);
                getTeacherExercisesPaginated($scope.pageno, $scope.filterExercisesParams);
                _getExercisesCount($scope.filterExercisesParams);
            };

            $scope.$watch('search.searchExercisesText', function(newValue, oldValue) {
                if (newValue !== oldValue && (oldValue || oldValue === '') || (!oldValue && newValue)) {
                    if (newValue || newValue === '') {
                        $scope.filterExercisesParams.name = newValue;
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

            $document.on('click', clickDocumentHandler);

            $scope.$on('$destroy', function() {
                $window.onfocus = null;
                $document.off('click', clickDocumentHandler);
            });
        });
})();
