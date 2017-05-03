'use strict';

var angular = require('angular');

var app = angular.module('blockchainWalletApp', [require('angular-sanitize'),
    require('angular-ui-router'), require('ng-file-upload'), require('angular-ui-bootstrap')]);

app.config(function($stateProvider, $urlRouterProvider) {

    var homeState = {
        name: 'home',
        url: '/',
        views: {
            navbar: {
                templateUrl: '/templates/navbar.html',
                controller: 'mainCtrl'
            },
            home: {
                templateUrl: '/templates/home.html',
                controller: 'mainCtrl'
            },
            block: {
                templateUrl: '/templates/block.html',
                controller: 'blockCtrl'
            },
            explore: {
                templateUrl: '/templates/explore.html',
                controller: 'mainCtrl'
            }
        }
    };

    var keygenState = {
        name: 'keygen',
        url: '/keygen',
        views: {
            navbar: {
                templateUrl: '/templates/navbar-alt.html',
                controller: 'mainCtrl'
            },
            keygen: {
                templateUrl: '/templates/keygen.html',
                controller: 'mainCtrl'
            }
        }
    };

    var sendState = {
        name: 'send',
        url: '/send',
        views: {
            navbar: {
                templateUrl: '/templates/navbar-alt.html',
                controller: 'mainCtrl'
            },
            send: {
                templateUrl: '/templates/send.html',
                controller: 'mainCtrl'
            }

        }
    };


    var exploreState = {
        name: 'explore',
        url: '/explore',
        views: {
            navbar: {
                templateUrl: '/templates/navbar-alt.html',
                controller: 'mainCtrl'
            },
            explore: {
                templateUrl: '/templates/explore.html',
                controller: 'mainCtrl'
            },
            block: {
                templateUrl: '/templates/block.html',
                controller: 'blockCtrl'
            }

        }
    };

    var accountState = {
        name: 'account',
        url: '/account',
        views: {
            navbar: {
                templateUrl: '/templates/navbar-alt.html',
                controller: 'mainCtrl'
            },
            home: {
                templateUrl: '/templates/account.html',
                controller: 'accountCtrl'
            }
        }
    };



    var signupState = {
        name: 'signup',
        url: '/signup',
        views: {
            navbar: {
                templateUrl: '/templates/navbar-alt.html',
                controller: 'mainCtrl'
            },
            signup: {
                templateUrl: '/templates/signup.html',
                controller: 'signupCtrl'
            }

        }
    };

    var signinState = {
        name: 'signin',
        url: '/signin',
        views: {
            navbar: {
                templateUrl: '/templates/navbar-alt.html',
                controller: 'mainCtrl'
            },
            signin: {
                templateUrl: '/templates/signin.html',
                controller: 'signinCtrl'
            }
        }
    };


    $stateProvider.state(homeState);
    $stateProvider.state(sendState);
    $stateProvider.state(exploreState);
    $stateProvider.state(keygenState);
    $stateProvider.state(accountState);
    $stateProvider.state(signupState);
    $stateProvider.state(signinState);

    $urlRouterProvider.when('', '/');
});

require('./controllers');
// require('./directives');
require('./services');