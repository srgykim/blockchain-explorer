'use strict';

function SigninDirective() {
    return {
        templateUrl: '/templates/signin.html',
        replace: true,
        controller: 'signinCtrl'
    };
}

module.exports = SigninDirective;
