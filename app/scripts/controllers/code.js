'use strict';
/* global js_beautify */

/**
 * @ngdoc function
 * @name bitbloqApp.controller:CodeCtrl
 * @description
 * # CodeCtrl
 * Controller of the bitbloqApp
 */
angular.module('bitbloqApp')
    .controller('CodeCtrl', function($scope, $q, projectApi, $routeParams, _, alertsService, $timeout, utils, $location, web2board, $window, $rootScope, commonModals, $route, web2boardOnline, compilerApi, hardwareConstants, projectService) {

        var editInfo, editorRef,
            compilingAlert,
            settingBoardAlert,
            serialMonitorAlert;

        projectService.saveStatus = 0;

        // The ui-ace option
        $scope.aceOptions = {
            mode: 'c_cpp',
            useWrapMode: false,
            showGutter: true,
            theme: 'chrome',
            advanced: {
                enableSnippets: true,
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true
            },
            rendererOptions: {
                fontSize: 14,
                minLines: 11
            },
            onLoad: function(_editor) {
                editorRef = _editor;
                _loadProject();
                editorRef.on('paste', function() {
                    setTimeout(function() {
                        _prettyCode();
                    }, 10);
                });
            }
        };

        $scope.boardNameList = _.pluck(hardwareConstants.boards, 'name');
        $scope.genericBoardNameList = _.pluck(hardwareConstants.genericBoards, 'name');

        $scope.common.isLoading = true;

        $scope.commonModals = commonModals;
        $scope.isWeb2BoardInProgress = web2board.isInProcess;
        $scope.projectApi = projectApi;
        $scope.projectService = projectService;
        $scope.utils = utils;

        $scope.onFieldKeyUp = function(event) {
            if ((event.ctrlKey || event.metaKey) && String.fromCharCode(event.which).toLowerCase() === 's') { //Ctrl + S
                return true;
            }
        };

        $scope.publishProject = function(type) {
            projectService.checkPublish(type).then(function() {
                $scope.publishProjectError = false;
                if (type === 'Social') {
                    commonModals.shareSocialModal(projectService.project);
                } else {
                    commonModals.publishModal(projectService.project);
                }
            }).catch(function() {
                $scope.publishProjectError = true;
                $scope.currentTab = 'info';
            });
        };

        $scope.showWeb2boardSettings = function() {
            web2board.showSettings();
        };

        $scope.serialMonitor = function() {
            if (web2board.isWeb2boardV2()) {
                serialMonitorW2b2();
            } else {
                serialMonitorW2b1();
            }
        };

        $scope.setBoard = function(boardName) {
            var indexTag = projectService.project.hardwareTags.indexOf(projectService.project.hardware.board);
            if (indexTag !== -1) {
                projectService.project.hardwareTags.splice(indexTag, 1);
            }
            projectService.project.hardware.board = boardName || 'bq ZUM'; //Default board is ZUM
            var boardMetadata = projectService.getBoardMetaData();
            if (boardName === 'Generic board') {
                $scope.boardImage = 'GenericBoard';
            } else {
                $scope.boardImage = boardMetadata && boardMetadata.id;
            }

            projectService.project.hardwareTags.push(projectService.project.hardware.board);
        };

        $scope.setGenericBoard = function(boardName) {
            projectService.project.genericBoardSelected = _.find(hardwareConstants.genericBoards, {
                name: boardName
            });
        };

        $scope.toggleCollapseHeader = function() {
            $scope.collapsedHeader = !$scope.collapsedHeader;
        };

        $scope.upload = function() {
            if ($scope.common.useChromeExtension()) {
                web2boardOnline.compileAndUpload({
                    board: projectService.getBoardMetaData(),
                    code: utils.prettyCode(projectService.project.code)
                });
            } else {
                if (web2board.isWeb2boardV2()) {
                    uploadW2b2();
                } else {
                    uploadW2b1();
                }
            }
        };

        $scope.uploadFileProject = function(project) {
            projectService.setProject(project, 'code');
            $scope.setBoard(projectService.project.board);
            _prettyCode().then(function() {
                projectService.addCodeWatchers();
            });
        };

        $scope.verify = function() {
            if ($scope.common.useChromeExtension()) {
                var board = projectService.getBoardMetaData();
                if (!board) {
                    board = 'bt328';
                } else {
                    board = board.mcu;
                }
                compilerApi.compile({
                    board: board,
                    code: utils.prettyCode(projectService.project.code)
                }).then(function(response) {
                    console.log('response');
                    console.log(response);
                    if (response.data.error) {
                        alertsService.add({
                            id: 'web2board',
                            type: 'warning',
                            translatedText: utils.parseCompileError(response.data.error)
                        });
                    } else {
                        alertsService.add({
                            text: 'alert-web2board-compile-verified',
                            id: 'web2board',
                            type: 'ok',
                            time: 5000
                        });
                    }
                });
            } else {
                if (web2board.isWeb2boardV2()) {
                    verifyW2b2();
                } else {
                    verifyW2b1();
                }
            }
        };

        //---------------------------------------------------------------------------------
        //---------------------------------------------------------------------------------
        //---------------- PRIVATE FUNCTIONS ----------------------------------------------
        //---------------------------------------------------------------------------------
        //---------------------------------------------------------------------------------

        function confirmExit() {
            var closeMessage;
            if (projectService.saveStatus === 1) {
                closeMessage = $scope.common.translate('leave-without-save');
            }
            return closeMessage;
        }

        function serialMonitorW2b1() {
            if ($scope.isWeb2BoardInProgress()) {
                return false;
            }
            if (projectService.project.hardware.board) {
                web2board.setInProcess(true);
                serialMonitorAlert = alertsService.add({
                    text: 'alert-web2board-openSerialMonitor',
                    id: 'serialmonitor',
                    type: 'loading'
                });
                var boardMetadata = projectService.getBoardMetaData();
                web2board.serialMonitor(boardMetadata);
            } else {
                $scope.currentTab = 'info';
                alertsService.add({
                    text: 'alert-web2board-no-board-serial',
                    id: 'serialmonitor',
                    type: 'warning'
                });
            }
        }

        function serialMonitorW2b2() {
            if (projectService.project.hardware.board) {
                web2board.serialMonitor(projectService.getBoardMetaData());
            } else {
                $scope.currentTab = 0;
                $scope.levelOne = 'boards';
                alertsService.add({
                    text: 'alert-web2board-no-board-serial',
                    id: 'serialmonitor',
                    type: 'warning'
                });
            }
        }

        function uploadW2b1() {
            $scope.$emit('uploading');
            if ($scope.isWeb2BoardInProgress()) {
                return false;
            }
            if (projectService.project.hardware.board) {
                web2board.setInProcess(true);
                var boardMetadata = projectService.getBoardMetaData();
                settingBoardAlert = alertsService.add({
                    text: 'alert-web2board-settingBoard',
                    id: 'upload',
                    type: 'loading'
                });
                web2board.setInProcess(true);

                web2board.upload(boardMetadata, utils.prettyCode(projectService.project.code));
            } else {
                $scope.currentTab = 'info';
                alertsService.add({
                    text: 'alert-web2board-boardNotReady',
                    id: 'upload',
                    type: 'warning'
                });
            }
        }

        function uploadW2b2() {
            if (projectService.project.hardware.board) {
                web2board.upload(projectService.getBoardMetaData().mcu, utils.prettyCode(projectService.project.code));
            } else {
                $scope.currentTab = 'info';
                alertsService.add({
                    text: 'alert-web2board-boardNotReady',
                    id: 'upload',
                    type: 'warning'
                });
            }
        }

        function verifyW2b1() {
            if ($scope.isWeb2BoardInProgress()) {
                return false;
            }
            web2board.setInProcess(true);

            compilingAlert = alertsService.add({
                text: 'alert-web2board-compiling',
                id: 'compile',
                type: 'loading'
            });
            web2board.setInProcess(true);

            web2board.verify(utils.prettyCode(projectService.project.code));
        }

        function verifyW2b2() {
            web2board.verify(utils.prettyCode(projectService.project.code));
        }

        function _goToBloqs() {
            alertsService.close(editInfo);
            $location.url('/bloqsproject/' + projectService.project._id);
        }

        function _prettyCode() {
            var currentCursor = editorRef.getCursorPosition(),
                defered = $q.defer(),
                tmpCode = '';

            // Options
            editorRef.$blockScrolling = Infinity;
            editorRef.setAutoScrollEditorIntoView(true);

            //Prepare string to js_beautify
            function insertBeautyIgnores(match) {
                return '/* beautify ignore:start */' + match + '/* beautify ignore:end */';
            }

            //Remove beautify ignore & preserve sections
            tmpCode = js_beautify(projectService.project.code.replace(/(#include *.*)/gm, insertBeautyIgnores).replace(/(#define *.*)/gm, insertBeautyIgnores)).replace(/(\/\* (beautify)+ .*? \*\/)/gm, ''); // jshint ignore:line

            $timeout(function() {

                projectService.project.code = tmpCode;
                $timeout(function() {
                    editorRef.moveCursorTo(currentCursor.row, currentCursor.column, true);
                });
                defered.resolve();
            });

            return defered.promise;
        }

        function _loadProject() {
            projectService.initCodeProject();
            if ($routeParams.id) {
                projectApi.get($routeParams.id).then(function(response) {
                    if (!response.data.codeProject) {
                        editInfo = alertsService.add({
                            text: 'code-project_alert_edit-code',
                            id: 'edit-project',
                            type: 'warning',
                            time: 7000,
                            linkText: 'undo',
                            link: _goToBloqs
                        });
                        response.data.hardwareTags = [];
                    }
                    projectService.setProject(response.data, 'code');
                    if ($scope.common.user && projectService.project._acl['user:    ' + $scope.common.user._id] && projectService.project._acl['user:' + $scope.common.user._id].permission === 'READ') {
                        $scope.disablePublish = true;
                    }

                    $scope.setBoard(projectService.project.hardware.board);

                    _prettyCode().then(function() {
                        projectService.addCodeWatchers();
                    });

                }, function(response) {
                    switch (response.status) {
                        case 404: //not_found
                            alertsService.add({
                                text: 'no-project',
                                id: 'load-project',
                                type: 'warning'
                            });
                            break;
                        case 401: //unauthorized
                            $route.current.pathParams.id = '';
                            $location.url('/codeproject/');
                            alertsService.add({
                                text: 'alert_text_errorProjectUnauthorized',
                                id: 'load-project',
                                type: 'warning'
                            });
                            break;
                        default:
                            alertsService.add({
                                text: 'alert_text_errorProjectUndefined',
                                id: 'load-project',
                                type: 'warning'
                            });
                    }
                    projectService.addCodeWatchers();
                });
            } else {
                if ($scope.common.session.bloqTab) {
                    editInfo = alertsService.add({
                        text: 'code-project_alert_edit-code',
                        id: 'edit-project',
                        type: 'warning'
                    });
                }

                $scope.common.itsUserLoaded().then(function() {
                    if ($scope.common.session.save) {
                        projectService.setProject($scope.common.session.project, 'code');
                        $scope.common.session.save = false;
                        projectService.startAutosave();
                    }
                    $scope.setBoard(projectService.project.hardware.board);
                    _prettyCode().then(function() {
                        projectService.addCodeWatchers();
                    });
                }).catch(function() {
                    if ($scope.common.session.project.code) {
                        projectService.setProject($scope.common.session.project, 'code');
                    }
                    if ($scope.common.session.project.hardware.board) {
                        $scope.setBoard($scope.common.session.project.hardware.board);
                    }
                    _prettyCode().then(function() {
                        projectService.addCodeWatchers();
                    });
                });
            }
        }

        $scope.showPlotter = function() {
            if (projectService.project.hardware.board) {
                if ($scope.common.useChromeExtension()) {
                    commonModals.launchPlotterWindow(projectService.getBoardMetaData());
                } else {
                    if (web2board.isWeb2boardV2()) {
                        plotterW2b2();
                    } else {
                        plotterW2b1();
                    }
                }
            } else {
                $scope.currentTab = 0;
                $scope.levelOne = 'boards';
                alertsService.add({
                    text: 'alert-web2board-no-board-serial',
                    id: 'serialmonitor',
                    type: 'warning'
                });
            }

        };

        function plotterW2b1() {
            if ($scope.isWeb2BoardInProgress()) {
                return false;
            }
            if (projectService.project.hardware.board) {
                web2board.setInProcess(true);
                serialMonitorAlert = alertsService.add({
                    text: 'alert-web2board-openSerialMonitor',
                    id: 'serialmonitor',
                    type: 'loading'
                });
                //todo....
                var boardReference = projectService.getBoardMetaData();
                web2board.plotter(boardReference);
            } else {
                $scope.currentTab = 0;
                $scope.levelOne = 'boards';
                alertsService.add({
                    text: 'alert-web2board-no-board-serial',
                    id: 'serialmonitor',
                    type: 'warning'
                });

            }
        }

        function plotterW2b2() {
            if (projectService.project.hardware.board) {
                web2board.plotter(projectService.getBoardMetaData());
            } else {
                $scope.currentTab = 0;
                $scope.levelOne = 'boards';
                alertsService.add({
                    text: 'alert-web2board-no-board-serial',
                    id: 'serialmonitor',
                    type: 'warning'
                });
            }
        }

        /*************************************************
         web2board communication
         *************************************************/

        var w2bDisconnectedEvent = $rootScope.$on('web2board:disconnected', function() {
            web2board.setInProcess(false);
        });

        var w2bVersionEvent = $rootScope.$on('web2board:wrong-version', function() {
            web2board.setInProcess(false);
        });

        var w2bNow2bEvent = $rootScope.$on('web2board:no-web2board', function() {
            alertsService.close(compilingAlert);
            alertsService.close(settingBoardAlert);
            web2board.setInProcess(false);
        });

        var w2bCompileErrorEvent = $rootScope.$on('web2board:compile-error', function(event, error) {
            error = JSON.parse(error);
            alertsService.add({
                text: 'alert-web2board-compile-error',
                id: 'compile',
                type: 'warning'
            });
            web2board.setInProcess(false);
        });

        var w2bCompileVerifiedEvent = $rootScope.$on('web2board:compile-verified', function() {
            alertsService.add({
                text: 'alert-web2board-compile-verified',
                id: 'compile',
                type: 'ok',
                time: 5000
            });
            web2board.setInProcess(false);
        });

        var w2bBoardReadyEvent = $rootScope.$on('web2board:boardReady', function(evt, data) {
            data = JSON.parse(data);
            if (data.length > 0) {
                if (!alertsService.isVisible('uid', serialMonitorAlert)) {
                    alertsService.add({
                        text: 'alert-web2board-boardReady',
                        id: 'upload',
                        type: 'ok',
                        time: 5000,
                        value: data[0]
                    });
                }
            } else {
                alertsService.add({
                    text: 'alert-web2board-boardNotReady',
                    id: 'upload',
                    type: 'warning'
                });
            }
        });

        var w2bBoardNotReadyEvent = $rootScope.$on('web2board: boardNotReady', function() {
            alertsService.add({
                text: 'alert-web2board-boardNotReady',
                id: 'upload',
                type: 'warning'
            });
            web2board.setInProcess(false);
        });

        var w2bUploadingEvent = $rootScope.$on('web2board:uploading', function(evt, port) {
            alertsService.add({
                text: 'alert-web2board-uploading',
                id: 'upload',
                type: 'loading',
                value: port
            });
            web2board.setInProcess(true);
        });

        var w2bCodeUploadedEvent = $rootScope.$on('web2board:code-uploaded', function() {
            alertsService.add({
                text: 'alert-web2board-code-uploaded',
                id: 'upload',
                type: 'ok',
                time: 5000
            });
            web2board.setInProcess(false);
        });

        var w2bUploadErrorEvent = $rootScope.$on('web2board:upload-error', function(evt, data) {
            data = JSON.parse(data);
            if (!data.error) {
                alertsService.add({
                    text: 'alert-web2board-upload-error',
                    id: 'upload',
                    type: 'warning'
                });
            } else if (data.error === 'no port') {
                alertsService.add({
                    text: 'alert-web2board-upload-error',
                    id: 'upload',
                    type: 'warning'
                });
            } else {
                alertsService.add({
                    text: 'alert-web2board-upload-error',
                    id: 'upload',
                    type: 'warning',
                    value: data.error
                });
            }
            web2board.setInProcess(false);
        });

        var w2bNoPortFoundEvent = $rootScope.$on('web2board:no-port-found', function() {
            $scope.currentTab = 'info';
            web2board.setInProcess(false);
            alertsService.close(serialMonitorAlert);
            alertsService.add({
                text: 'alert-web2board-no-port-found',
                id: 'upload',
                type: 'warning'
            });
        });

        var w2bSerialOpenedEvent = $rootScope.$on('web2board:serial-monitor-opened', function() {
            alertsService.close(serialMonitorAlert);
            web2board.setInProcess(false);
        });

        function _destroyWeb2boardEvents() {
            w2bDisconnectedEvent();
            w2bVersionEvent();
            w2bNow2bEvent();
            w2bCompileErrorEvent();
            w2bCompileVerifiedEvent();
            w2bBoardReadyEvent();
            w2bBoardNotReadyEvent();
            w2bUploadingEvent();
            w2bCodeUploadedEvent();
            w2bUploadErrorEvent();
            w2bNoPortFoundEvent();
            w2bSerialOpenedEvent();
        }

        /*************************************************
         WATCHERS
         *************************************************/

        $scope.$watch('common.session.save', function(newVal, oldVal) {
            if (newVal && newVal !== oldVal) {
                $scope.common.session.project = projectService.project;
            }
        });

        $window.onbeforeunload = confirmExit;

        $scope.$on('$destroy', function() {
            $window.onbeforeunload = null;
            _destroyWeb2boardEvents();
        });
    });