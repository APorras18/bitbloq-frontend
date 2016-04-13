'use strict';

/**
 * @ngdoc service
 * @name bitbloqApp.projectApi
 * @description
 * # projectApi
 * Service in the bitbloqApp.
 */
angular.module('bitbloqApp')
    .service('projectApi', function($http, $log, $window, envData, $q, $rootScope, _, alertsService, imageApi, userApi, common, utils, ngDialog, $translate, resource) {
        // AngularJS will instantiate a singleton by calling "new" on this function

        var exports = {};

        exports.get = function(id, params) {
            params = params || {};
            return $http({
                method: 'GET',
                url: envData.config.gCloudEndpoint + 'project/' + id,
                //params: params


                skipAuthorization: true,
                responseType: undefined
                //responseType: 'blob'

            });
        };

        exports.getPublic = function(queryParams, queryParams2) {

            //Todo queryParams2 -> search by username
            console.log(queryParams2);

            return $http({
                method: 'GET',
                url: envData.config.gCloudEndpoint + 'project',
                params: queryParams
            });

        };

        exports.getPublicCounter = function(queryParams, queryParams2) {
            angular.extend(queryParams, {
                'count': '*'
            });
            return exports.getPublic(queryParams, queryParams2);
        };


        exports.getMyProjects = function(queryParams) {

            var myProjectArray = [],
                params = {
                    'page': 0,
                    'pageSize': 30
                };
            //    'sort': {
            //        '_updatedAt': 'desc'
            //    },

            queryParams = queryParams || {};
            _.extend(params, queryParams);

            return resource.getAll('project/me', params, myProjectArray);
        };

        exports.getMySharedProjects = function(queryParams) {

            var myProjectArray = [],
                params = {
                    'page': 0,
                    'pageSize': 30
                };
            //'sort': {
            //    '_updatedAt': 'desc'
            //},

            queryParams = queryParams || {};
            _.extend(params, queryParams);

            return resource.getAll('project/shared', params, myProjectArray);
        };




        exports.save = function(dataproject, file) {
            /*return $http.post(envData.config.gCloudEndpoint + 'project', file, {
             transformRequest: angular.identity,
             headers: {'Content-Type': undefined}
             });*/

            return $http.post(envData.config.gCloudEndpoint + 'project', file, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                transformRequest: function(data, headersGetter) {
                    var formData = new FormData();
                    angular.forEach(data, function(value, key) {
                        formData.append(key, value);
                    });

                    var headers = headersGetter();
                    delete headers['Content-Type'];

                    return formData;
                }
            });


            /*return $http({
             method: 'POST',
             url: envData.config.gCloudEndpoint + 'project',
             headers: {
             'Content-Type': 'multipart/form-data'
             },
             transformRequest: function (data, headersGetter) {
             var formData = new FormData();
             angular.forEach(data, function (value, key) {
             formData.append(key, value);
             });

             var headers = headersGetter();
             delete headers['Content-Type'];

             return formData;
             },
             data: {
             file: file
             }
             });*/

        };


        exports.save2 = function(dataproject, file) {
            return $http({
                method: 'POST',
                url: envData.config.gCloudEndpoint + 'project',
                headers: {
                    'Content-Type': 'image/jpeg'
                },
                data: file
            });
        };


        exports.saveDefault = function(dataproject) {
            return $http({
                method: 'POST',
                url: envData.config.gCloudEndpoint + 'project',
                data: dataproject
            });
        };

        exports.update = function(idProject, dataproject) {
            return $http({
                method: 'PUT',
                url: envData.config.gCloudEndpoint + 'project/' + idProject,
                data: dataproject
            });
        };

        exports.publish = function(idProject) {
            return $http({
                method: 'PUT',
                url: envData.config.gCloudEndpoint + 'project/' + idProject + '/publish'
            });
        };

        exports.private = function(idProject) {
            return $http({
                method: 'PUT',
                url: envData.config.gCloudEndpoint + 'project/' + idProject + '/private'
            });
        };

        exports.shareWithUsers = function(idProject, userEmails) {
            return $http({
                method: 'PUT',
                url: envData.config.gCloudEndpoint + 'project/' + idProject + '/share',
                data: userEmails
            });
        };

        exports.delete = function(idProject) {
            return $http({
                method: 'DELETE',
                url: envData.config.gCloudEndpoint + 'project/' + idProject
            });
        };


//---------------------------------------------------------------------------------
//---------------------------------------------------------------------------------
//---------------------------------------------------------------------------------
//---------------------------------------------------------------------------------
//---------------------------------------------------------------------------------


        exports.getShortURL = function(longUrl) {
            // Request short url
            return $http.post('https://www.googleapis.com/urlshortener/v1/url?key=' + envData.google.apikey, {
                longUrl: longUrl
            }).success(function(response) {
                return response.id;
            }).error(function(error) {
                return error.error.message;
            });
        };

        exports.getCleanProject = function(projectRef) {
            var cleanProject = _.cloneDeep(projectRef);
            delete cleanProject._id;
            delete cleanProject._acl;
            delete cleanProject.creatorId;
            delete cleanProject.creatorUsername;
            delete cleanProject._createdAt;
            delete cleanProject._updatedAt;
            delete cleanProject.links;

            return cleanProject;
        };

        exports.download = function(projectRef) {
            var project = exports.getCleanProject(projectRef);
            var filename = utils.removeDiacritics(projectRef.name, undefined, $translate.instant('new-project'));

            utils.downloadFile(filename.substring(0, 30) + '.json', JSON.stringify(project), 'application/json');
        };

        exports.downloadIno = function(project, code) {
            code = code || project.code;
            var name = project.name;
            //Remove all diacritics
            name = utils.removeDiacritics(name, undefined, $translate.instant('new-project'));

            utils.downloadFile(name.substring(0, 30) + '.ino', code, 'text/plain;charset=UTF-8');
        };

        exports.generateShortUrl = function(longUrl) {
            return $http({
                method: 'POST',
                url: 'https://www.googleapis.com/urlshortener/v1/url?key=AIzaSyA4NIAP4k3TA0kpo6POxWcS_2-Rpj_JaoE',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                data: {
                    longUrl: longUrl
                },
                skipAuthorization: true
            });
        };

        exports.isShared = function(project) {
            var found = false,
                i = 0,
                propertyNames = Object.getOwnPropertyNames(project._acl);
            while (!found && (i < propertyNames.length)) {
                if (propertyNames[i] !== 'ALL' && common.user && propertyNames[i].split('user:')[1] !== common.user._id) {
                    found = true;
                }
                i++;
            }
            return found;
        };

        return exports;
    });
