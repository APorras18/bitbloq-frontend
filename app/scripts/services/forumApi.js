'use strict';
angular
    .module('bitbloqApp')
    .service('forumApi', function($http, envData) {

        var forumApi = {
            getForumIndex: getForumIndex,
            getTheme: getTheme,
            getThemesInCategory: getThemesInCategory,
            addViewer: addViewer,
            createThread: createThread,
            createAnswer: createAnswer
        };

        return forumApi;

        // Get Data
        function getData(resource, options) {
            //if no soy el user owner
            resource = resource || '';
            options = options || {};

            return $http({
                method: 'GET',
                url: envData.config.serverUrl + 'forum' + resource,
                params: options
            });
        }

        function getForumIndex() {
            return getData();
        }

        function getTheme(themeId) {
            return getData('/thread/' + themeId);
        }

        function getThemesInCategory(categoryName) {
            return getData('/category/' + categoryName);
        }

        function addViewer(threadId) {
            return $http({
                method: 'HEAD',
                url: envData.config.serverUrl + 'forum/threadStats/views/' + threadId
            });
        }

        function createThread(thread, answer) {
            return $http({
                method: 'POST',
                url: envData.config.serverUrl + 'forum/thread',
                data: {
                    thread: thread,
                    answer: answer
                }
            });
        }

        function createAnswer(answer) {
            return $http({
                method: 'POST',
                url: envData.config.serverUrl + 'forum/answer',
                data: answer
            });
        }
    });