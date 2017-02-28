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
            main: {
                templateUrl: '/templates/main.html',
                controller: 'mainCtrl'
            },
            block: {
                templateUrl: '/templates/block.html',
                controller: 'blockCtrl'
            }
        }
    };

    var signupState = {
        name: 'signup',
        url: '/signup',
        views: {
            navbar: {
                templateUrl: '/templates/navbar.html',
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
                templateUrl: '/templates/navbar.html',
                controller: 'mainCtrl'
            },
            signin: {
                templateUrl: '/templates/signin.html',
                controller: 'signinCtrl'
            }
        }
    };

    $stateProvider.state(homeState);
    $stateProvider.state(signupState);
    $stateProvider.state(signinState);

    $urlRouterProvider.when('', '/');
});

require('./controllers');
require('./directives');
require('./services');