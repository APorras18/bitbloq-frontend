/*jshint camelcase: false */
'use strict';

/**
 * @ngdoc function
 * @name bitbloqApp.controller:LoginCtrl
 * @description
 * # LoginCtrl
 * Controller of the bitbloqApp
 */
angular.module('bitbloqApp')
    .controller('LoginCtrl', function($scope, User, envData, $log, userApi, _, $cookieStore, $auth, $location, $q, moment, alertsService, ngDialog, $routeParams, $translate, userRobotsApi) {

        $scope.envData = envData;
        $scope.isLogin = true;
        $scope.isSocialRegister = false;
        $scope.isForgotPassword = false;
        $scope.checked = false;

        $scope.user = {
            username: '',
            email: '',
            firstName: '',
            lastName: '',
            password: '',
            birthday: null,
            cookiePolicyAccepted: false,
            newsletter: false,
            takeTour: false,
            language: 'es-ES',
            hasFirstComponent: false
        };
        $scope.username = {
            invalid: false,
            free: true,
            searching: false,
            search: false
        };
        $scope.email = {
            free: true,
            searching: false,
            search: false
        };
        $scope.errors = {
            login: {
                password: false,
                emailUserName: false
            },
            register: {
                email: false,
                emptyBirthday: false,
                validBirthday: false,
                socialEmail: false
            },
            disconnect: false
        };
        $scope.recovery = {
            emailError: false,
            success: false,
            error: false
        };
        $scope.providerOptions = {};

        var userName,
            email;


        $scope.authenticate = function(prov) {
            localStorage.removeItem('satellizer_token');
            $cookieStore.remove('token');
            $auth.authenticate(prov).then(function(response) {
                var options = {
                    provider: prov,
                    accessToken: response.access_token
                };

                $scope.providerOptions = options;

                userApi.loginBySocialNetwork($scope.providerOptions).then(function(loginResponse) {
                        // Set user data
                        if (loginResponse.data.next === 'register') {
                            $scope.isSocialRegister = true;
                            $scope.user.email = loginResponse.data.email;
                            $scope.showEmailForm = !loginResponse.data.email;
                        } else {
                            $cookieStore.put('token', loginResponse.data.token);
                            userApi.currentUser = User.get();
                            userApi.currentUser.$promise.then(function(user) {
                                userRobotsApi.getUserRobots(user._id).then(function(res) {
                                    user.thirdPartyRobots = res.data;
                                }).finally(function() {
                                    $scope.common.setUser(user);
                                    if ($scope.common.user.hasBeenAskedIfTeacher || $scope.common.user.newsletter) {
                                        _goToHome();
                                    } else {
                                        teacherModal();
                                    }
                                });
                            });
                        }
                    },
                    function(err) {
                        console.log('LOGIN ERROR: ', err);
                    });
            });
        };

        $scope.checkAge = function(form) {
            if (form.birthday && form.birthday.day && form.birthday.month && form.birthday.year) {
                var validBirthday = !moment(form.birthday.day + ', ' + form.birthday.month + ', ' + form.birthday.year, 'DD, MM, YYYY')
                    .isValid();
                if (!validBirthday) {
                    var userBirthday = new Date(form.birthday.year, form.birthday.month - 1, form.birthday.day);
                    var older = new Date();
                    older.setYear(older.getFullYear() - 14);
                    $scope.userUnder14Years = userBirthday >= older && userBirthday <= new Date();
                }
            }
        };

        $scope.checkEmail = function() {
            var defered = $q.defer();
            $scope.focus = false;
            if ($scope.user.email !== email) {
                $scope.email.search = false;
                $scope.email.free = true;
                $scope.email.searching = false;
                email = $scope.user.email;
                if ($scope.user.email && $scope.user.email !== '') {
                    $scope.email.empty = false;
                    $scope.email.searching = true;
                    userApi.validateEmail($scope.user.email.toLowerCase()).then(function(res) {
                        if (res.status === 200) {
                            $scope.email.searching = false;
                            $scope.email.search = true;
                            $scope.email.free = false;
                            defered.resolve(false);
                        } else {
                            $scope.email.searching = false;
                            $scope.email.free = true;
                            $scope.email.search = true;
                            defered.resolve(true);
                        }
                    });
                } else {
                    defered.resolve(false);
                }
            } else {
                defered.resolve(false);
            }
            return defered.promise;
        };

        $scope.checkSocialForm = function() {
            $scope.checkUserName();
            $scope.checkEmail();
        };

        $scope.checkUserName = function() {
            var defered = $q.defer();
            $scope.focus = false;
            if ($scope.user.username !== userName) {
                $scope.username.search = false;
                userName = $scope.user.username;
                $scope.username.invalid = false;
                if ($scope.user.username && $scope.user.username !== '') {
                    if (isUserName()) {
                        $scope.username.empty = false;
                        $scope.username.searching = true;
                        userApi.validateUserName($scope.user.username.toLowerCase()).then(function(res) {
                            if (res.status === 200) {
                                $scope.username.searching = false;
                                $scope.username.search = true;
                                $scope.username.free = false;
                                defered.resolve(false);
                            } else {
                                $scope.username.searching = false;
                                $scope.username.free = true;
                                $scope.username.search = true;
                                defered.resolve(true);
                            }
                        });
                    } else {
                        $scope.username.invalid = true;
                        defered.resolve(false);
                    }
                } else {
                    defered.resolve(false);
                }
            } else {
                defered.resolve(false);
            }
            return defered.promise;
        };

        $scope.focusHandler = function(evt) {
            $scope.focus = evt.currentTarget.name;
        };

        $scope.loginSubmit = function(form) {
            $scope.errors.login.emailUserName = false;
            $scope.errors.login.password = false;
            if (!form.emailusername.$invalid && !form.password.$invalid) {
                if (_.indexOf(form.emailUserNameModel, '@') !== -1) {
                    $scope.user.email = form.emailUserNameModel;
                    delete $scope.user.username;
                } else {
                    $scope.user.username = form.emailUserNameModel.toLowerCase();
                    delete $scope.user.email;
                }
                login();
            } else {
                fireShakeEffect();
            }
        };

        $scope.registerSubmit = function(form) {
            form.username.submitted = true;
            form.password.submitted = true;
            form.email.submitted = true;
            form.readServiceTerm.submitted = true;
            if (form.birthday) {
                form.birthday.submitted = true;
            }
            form.tutorName.submitted = true;
            form.tutorSurname.submitted = true;
            form.tutorEmail.submitted = true;
            $scope.register(form);
        };

        $scope.register = function(form) {
            $scope.errors.register = {
                email: false,
                birthday: false,
                emptyBirthday: false,
                validBirthday: false,
                disconnect: false,
                sameTutorEmail: false
            };

            $scope.errors.login.emailUserName = false;
            $scope.errors.login.password = false;
            $scope.errors.disconnect = false;

            if (form.birthday && form.birthday.day && form.birthday.month && form.birthday.year) {
                $scope.errors.register.validBirthday = !moment(form.birthday.day + ', ' + form.birthday.month + ', ' + form.birthday.year, 'DD, MM, YYYY')
                    .isValid();
                if (!$scope.errors.register.validBirthday) {
                    if (new Date(form.birthday.year, form.birthday.month, form.birthday.day) > new Date()) {
                        $scope.errors.register.validBirthday = true;
                    }
                    $scope.user.birthday = new Date(form.birthday.year, form.birthday.month - 1, form.birthday.day);
                    var older = new Date();
                    older.setYear(older.getFullYear() - 14);
                    $scope.userUnder14Years = $scope.user.birthday >= older && $scope.user.birthday <= new Date();
                } else {
                    fireShakeEffect();
                }
            } else {
                fireShakeEffect();
                if (!form.year.$error.minlength) {
                    $scope.errors.register.emptyBirthday = true;
                    $scope.errors.register.validBirthday = false;
                } else {
                    $scope.errors.register.validBirthday = true;
                }
            }

            if ($scope.userUnder14Years && $scope.user.tutor) {
                if ($scope.user.email === $scope.user.tutor.email) {
                    $scope.errors.register.sameTutorEmail = true;
                }
            }

            function _validateRegister() {
                return !form.email.$invalid && !form.password.$invalid && !$scope.username.invalid && !form.username.$error.required &&
                    $scope.username.free &&
                    $scope.user.cookiePolicyAccepted && !$scope.errors.register.emptyBirthday && !$scope.errors.register.validBirthday &&
                    (!$scope.userUnder14Years || ($scope.userUnder14Years && !form.tutorName.$invalid && !form.tutorSurname.$invalid && !form.tutorEmail.$invalid && !$scope.errors.register.sameTutorEmail));
            }

            if (_validateRegister()) {
                if ($scope.userUnder14Years) {
                    $scope.user.needValidation = true;
                }
                $scope.user.username = $scope.user.username.toLowerCase();
                $scope.user.hasBeenAskedIfTeacher = true;
                $scope.user.language = $translate.use();
                userApi.registerUser($scope.user, function(err) {
                    if (err) {
                        throw err;
                    }
                    login(true);
                }, function(res) {
                    fireShakeEffect();
                    var errors = res.data.errors;
                    if (errors.email) {
                        $scope.errors.register.email = true;
                    }
                    if (errors.username) {
                        $scope.username.free = false;
                    }
                    $log.debug('register error: ', res);
                });
            } else {
                fireShakeEffect();
            }
        };

        $scope.registerSocial = function(form) {
            $scope.checkUserName().then(function() {
                if ($scope.showEmailForm) {
                    $scope.checkEmail().then(function() {
                        if ($scope.email.search && $scope.email.free && !form.emailSocial.$error.required && !form.emailSocial.$error.email && !form.emailSocial.$error.pattern) {
                            _registerSocialNetwork(form);
                        } else {
                            fireShakeEffect();
                        }
                    });
                } else {
                    _registerSocialNetwork(form);
                }
            });
        };

        function _registerSocialNetwork(form) {
            if ($scope.username.search && $scope.username.free && !$scope.username.invalid && !form.readServiceTerm.$error.required && !form.usernameSocial.$error.required) {
                var user = $scope.common.user || {};
                user.username = form.usernameSocial.$modelValue;
                user.hasBeenAskedIfTeacher = true;

                _.extend($scope.providerOptions, {
                    'register': true
                }, {
                    'username': user.username
                }, {
                    'hasBeenAskedIfTeacher': user.hasBeenAskedIfTeacher
                });

                if($scope.showEmailForm){
                    _.extend($scope.providerOptions, {
                        'email': $scope.user.email
                    });
                }

                userApi.loginBySocialNetwork($scope.providerOptions).then(function(response) {
                    $cookieStore.put('token', response.data.token);
                    userApi.currentUser = User.get();
                    userApi.currentUser.$promise.then(function(user) {
                        $scope.common.setUser(user);
                        if ($scope.common.user.hasBeenAskedIfTeacher || $scope.common.user.newsletter) {
                            _goToHome();
                        } else {
                            teacherModal();
                        }
                    });
                });
            } else {
                fireShakeEffect();
            }
        }


        $scope.setForgotPassword = function() {
            var $loginContainer = angular.element('#loginContainer');
            _transitionForm($loginContainer);
        };

        $scope.setForgotPasswordFromRegister = function() {
            var $registerContainer = angular.element('#registerContainer');
            _transitionForm($registerContainer);
        };

        $scope.setLoginFromForgotPassword = function() {
            var $forgotPasswordContainer = angular.element('#isForgotPassword');
            _transitionForm($forgotPasswordContainer);
        };

        $scope.setLoginFromRegister = function() {
            $scope.isLogin = true;
            var $registerContainer = angular.element('#registerContainer');
            _transitionForm($registerContainer);
        };

        $scope.forgotPassword = function(formForgot) {
            $scope.recovery.emailError = false;
            if (_.isEmpty(formForgot.$error)) {
                userApi.getUserId(formForgot.emailToSend.$modelValue).then(function() {
                    userApi.forgottenPassword(formForgot.emailToSend.$modelValue).then(function() {
                        $scope.recovery.success = true;
                        $scope.recovery.error = false;
                        alertsService.add({
                            text: 'email-recovery-password-ok',
                            id: 'recovery-password',
                            type: 'ok',
                            time: 5000
                        });
                    }, function() {
                        fireShakeEffect();
                        $scope.recovery.success = false;
                        $scope.recovery.error = true;
                    });
                }, function() {
                    fireShakeEffect();
                    $scope.recovery.emailError = true;
                });
            } else {
                fireShakeEffect();
            }
        };

        $scope.setRegister = function() {
            $scope.isLogin = false;
            var $loginContainer = angular.element('#loginContainer');
            _transitionForm($loginContainer);
        };


        /*************************
         *** PRIVATE FUNCTIONS ***
         *************************/

        function _goToHome() {
            if ($routeParams.init) {
                $location.url(decodeURIComponent($routeParams.init));
            } else {
                $location.path('projects');
            }
        }

        function _transitionForm(item) {
            item.addClass('form--login__container--transition-down');
            item.bind('webkitAnimationEnd', function() {
                $(this).addClass('hide-container');
                $(this).removeClass('form--login__container--transition-down');
            });
            var $loginContainer = angular.element('#loginContainer');
            $loginContainer.addClass('form--login__container--transition-up');
            $loginContainer.removeClass('hide-container');
            $loginContainer.bind('webkitAnimationEnd', function() {
                $(this).removeClass('form--login__container--transition-up');
                $(this).removeClass('hide-container');
            });
        }

        function fireShakeEffect() {
            angular.element('[data-effect="shake"]').addClass('shake');
            setTimeout(function() {
                angular.element('[data-effect="shake"]').removeClass('shake');
            }, 250);
        }

        function isUserName() {
            var regexp = /^[0-9]*[a-zA-Z]+[a-zA-Z0-9]*$/;
            return $scope.user.username.search(regexp) !== -1;
        }

        function login(register) {
            if ($scope.user.username) {
                $scope.user.username = $scope.user.username.toLowerCase();
            }
            var options = {
                email: $scope.user.email || $scope.user.username,
                password: $scope.user.password
            };
            userApi.loginUser(options).then(function(user) {
                userRobotsApi.getUserRobots(user._id).then(function(res) {
                    user.thirdPartyRobots = res.data;
                }).finally(function() {
                    $scope.common.setUser(user);
                    if (user.hasBeenAskedIfTeacher || user.newsletter || register) {
                        _goToHome();
                    } else {
                        teacherModal();
                    }
                });

            }).catch(function(error) {
                console.log('Error loggin in', error);
                fireShakeEffect();
                if (error) {
                    switch (error.status) {
                        case 401:
                            $scope.errors.login.emailUserName = false;
                            $scope.errors.login.password = true;
                            $scope.errors.disconnect = false;
                            break;
                        case 404:
                            $scope.errors.login.emailUserName = true;
                            $scope.errors.login.password = false;
                            $scope.errors.disconnect = false;
                            break;
                        case 500:
                            $scope.errors.login.emailUserName = false;
                            $scope.errors.login.password = false;
                            $scope.errors.disconnect = true;
                            break;
                    }
                }
            });
        }

        function teacherModal() {
            var confirmAction = function() {
                    $scope.common.user.hasBeenAskedIfTeacher = true;
                    $scope.common.user.isTeacher = $scope.radioTeacher.model === 'teacher' ? true : false;
                    userApi.update($scope.common.user).then(function() {
                        $scope.common.setUser($scope.common.user);
                        modalTeacher.close();
                        _goToHome();
                    }, function(err) {
                        $log.log('Error', err);
                    });
                },
                modalTeacher,
                modalOptions = $scope;
            $scope.radioTeacher = {
                model: ''
            };
            _.extend(modalOptions, {
                confirmOnly: true,
                contentTemplate: '/views/modals/teacher.html',
                confirmAction: confirmAction
            });

            modalTeacher = ngDialog.open({
                template: '/views/modals/modal.html',
                className: 'modal--container modal--teacher',
                scope: modalOptions,
                showClose: false,
                closeByDocument: false
            });
        }


        /***********
         **  init **
         ***********/

        switch ($location.path()) {
            case '/register':
                $scope.isLogin = false;
                break;
            case '/resetpassword':
                $scope.isForgotPassword = true;
                break;
        }

        $scope.common.itsUserLoaded().then(function() {
            if ($scope.common.user.hasBeenAskedIfTeacher || $scope.common.user.newsletter) {
                _goToHome();
            } else {
                teacherModal();
            }
        });
    });
