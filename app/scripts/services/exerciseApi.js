'use strict';

/**
 * @ngdoc service
 * @name bitbloqApp.exerciseApi
 * @description
 * # exerciseApi
 * Service in the bitbloqApp.
 */
angular.module('bitbloqApp')
    .service('exerciseApi', function($http, $log, envData) {

        var exerciseApi = {
            assignGroups: assignGroups,
            clone: clone,
            delete: deleteExercise,
            get: get,
            getTask: getTask,
            getTasks: getTasks,
            getTasksCount: getTasksCount,
            getTasksByExercise: getTasksByExercise,
            getTasksByExerciseCount: getTasksByExerciseCount,
            markTask: markTask,
            taskToProject: taskToProject,
            save: save,
            sendTask: sendTask,
            update: update,
            updateTask: updateTask,
            userIsHeadmaster: userIsHeadmaster
        };

        function assignGroups(idExercise, assignedGroups, removedGroups) {
            return $http({
                method: 'PUT',
                url: envData.config.centerModeUrl + 'exercise/' + idExercise + '/assign',
                data: {
                    'assign': assignedGroups,
                    'remove': removedGroups
                }
            });
        }

        function clone(exerciseId, name) {
            return $http({
                method: 'POST',
                url: envData.config.centerModeUrl + 'exercise/clone',
                data: {
                    exerciseId: exerciseId,
                    name: name
                }
            });
        }

        function deleteExercise(idExercise) {
            return $http({
                method: 'DELETE',
                url: envData.config.centerModeUrl + 'exercise/' + idExercise
            });
        }

        function get(id, params) {
            params = params || {};
            return $http({
                method: 'GET',
                url: envData.config.centerModeUrl + 'exercise/' + id,
                params: params
            });
        }

        function getTask(id) {
            return $http({
                method: 'GET',
                url: envData.config.centerModeUrl + 'task/' + id
            });
        }

        function getTasks(groupId, studentId, params) {
            if (groupId) {
                if (studentId) {
                    return $http({
                        method: 'GET',
                        url: envData.config.centerModeUrl + 'task/group/' + groupId + '/student/' + studentId
                    });
                } else {
                    return $http({
                        method: 'GET',
                        url: envData.config.centerModeUrl + 'task/group/' + groupId
                    });
                }
            } else {
                return $http({
                    method: 'GET',
                    url: envData.config.centerModeUrl + 'task',
                    params: params
                });
            }
        }

        function getTasksCount() {
            return $http({
                method: 'GET',
                url: envData.config.centerModeUrl + 'task/count'
            });
        }

        function getTasksByExercise(exerciseId, params) {
            return $http({
                method: 'GET',
                url: envData.config.centerModeUrl + 'task/exercise/' + exerciseId,
                params: params
            });
        }

        function getTasksByExerciseCount(exerciseId) {
            return $http({
                method: 'GET',
                url: envData.config.centerModeUrl + 'task/exercise/' + exerciseId + '/count'
            });
        }

        function markTask(task) {
            return $http({
                method: 'PUT',
                url: envData.config.centerModeUrl + 'task/' + task._id + '/mark',
                data: {
                    mark: task.newMark[0] + '.' + task.newMark[1],
                    remark: task.remark
                }
            });
        }

        function taskToProject(taskId) {
            return $http({
                method: 'POST',
                url: envData.config.centerModeUrl + 'task/cloneToProject',
                data: {
                    taskId: taskId
                }
            });
        }

        function save(dataExercise, teacherId) {
            if (teacherId) {
                dataExercise.teacher = teacherId;
            }
            return $http({
                method: 'POST',
                url: envData.config.centerModeUrl + 'exercise',
                data: dataExercise
            });
        }

        function sendTask(taskId) {
            return $http({
                method: 'put',
                url: envData.config.centerModeUrl + 'task/' + taskId + '/send'
            });
        }

        function update(idExercise, dataExercise) {
            return $http({
                method: 'PUT',
                url: envData.config.centerModeUrl + 'exercise/' + idExercise,
                data: dataExercise
            });
        }

        function updateTask(idTask, dataTask) {
            return $http({
                method: 'PUT',
                url: envData.config.centerModeUrl + 'task/' + idTask,
                data: dataTask
            });
        }

        function userIsHeadmaster(idExercise) {
            return $http({
                method: 'HEAD',
                url: envData.config.centerModeUrl + 'task/' + idExercise + '/headmaster'
            });
        }

        return exerciseApi;
    });
