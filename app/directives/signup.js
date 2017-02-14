'use strict';

function SignupDirective() {
    return {
        templateUrl: '/templates/signup.html',
        replace: true,
        controller: 'signupCtrl'
    };
}

module.exports = SignupDirective;
